'use strict';

const fs = require('fs');
const convert2vimdoc = require('./nodoc2vimdoc');
const shell = require('shelljs');

module.exports = function* (options) {
  console.log('Convert start');
  const toc_file = `${options.src}/${options.nodeVersion}/index.json`;
  if (!fs.existsSync(toc_file)) {
    throw new Error('File not found: ' + toc_file);
  }

  shell.mkdir('-p', `${options.dest}/${options.nodeVersion}`);

  // TODO: download && convert re-use.
  const RE_MARDDOWN_LINK = /\[([^\]]+)\]\(([^\)]+)\)/;
  const RE_HTML_EXT = /\.html$/;
  const docTOC = JSON.parse(fs.readFileSync(toc_file, {encoding: 'utf-8'}));
  console.log('debug', docTOC.length);
  docTOC.desc.filter(function(item) {
    return item.type === 'text';
  }).map(function(item) {
    const matched = RE_MARDDOWN_LINK.exec(item.text);
    const fileName = matched[2].replace(RE_HTML_EXT, '');
    return {
      title: matched[1],
      path: fileName + '.json',
      name: fileName,
    };
  }).forEach(function(item) {
    const file_name = `${item.name}.json`;
    const file_path = `${options.src}/${options.nodeVersion}/${file_name}`;
    const dest_path = `${options.dest}/${options.nodeVersion}/node-api-${item.name}.txt`;
    const content = JSON.parse(fs.readFileSync(file_path, {encoding: 'utf-8'}));

    try {
      const vimdoc = convert2vimdoc.convertModule(content, options.nodeVersion);
      fs.writeFile(dest_path, vimdoc);
    } catch (ex) {
      ex.message += ' in api doc: ' + file_path;
      throw ex;
    }
  });

};
