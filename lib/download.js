'use strict';

const request = require('request');
const fs = require('fs');
const shell = require('shelljs');

module.exports = function* (options) {
  const nodeVersion = options.nodeVersion;
  const dest_dir = options.dest || 'node-api-doc';
  const doc_toc_url = `https://iojs.org/dist/${nodeVersion}/doc/api/index.json`;
  const node_toc_url = `https://nodejs.org/dist/${nodeVersion}/docs/api/index.json`;
  const doc_toc_file_name = `${dest_dir}/index.json`;

  shell.mkdir('-p', dest_dir + '/' + nodeVersion);
  console.log(`downloading: ${doc_toc_url} to ${doc_toc_file_name}`);
  let origin = 'https://iojs.org';
  yield request(doc_toc_url)
    .pipe(fs.createWriteStream(doc_toc_file_name))
    .on('error', function() {
      origin = 'https://nodejs.org';
      request(node_toc_url)
        .pipe(fs.createWriteStream(doc_toc_file_name))
        .on('error', function(err) {
          console.error('Download Node API doc error: %s', err.message);
          origin = null;
        });
    });

  if (!origin) {
    return;
  }

  // TODO: download && convert re-use.
  const RE_MARDDOWN_LINK = /\[([^\]]+)\]\(([^\)]+)\)/;
  const RE_HTML_EXT = /\.html$/;
  const docTOC = JSON.parse(fs.readFileSync(doc_toc_file_name, {encoding: 'utf-8'}));
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
    const file_path = `${dest_dir}/${file_name}`;
    const doc_url = `${origin}/dist/${nodeVersion}/doc/api/${file_name}`;
    console.log(`downloading: ${doc_url} to ${file_path}`);
    request(doc_url)
      .on('error', function(err) {
        console.error(`download ${doc_url} failed: ${err.message}`);
      })
      .pipe(fs.createWriteStream(file_path));
  });

};
