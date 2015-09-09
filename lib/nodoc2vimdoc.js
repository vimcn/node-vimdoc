'use strict';

const profix = 'node-api-';

function html2vimdoc (html) {
  return html.replace(/<\/?p>/g, '')
             .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/mg, function($0, code) {
               return ' >\n' + code.split('\n').map(function(line) {
                 return '  ' + line;
               }).join('\n') +
               '\n<\n';
             })
             .replace(/<\/?code>/g, '`')
             .replace(/<\/?ul>/g, '')
             // 替换嵌套的 li > li
             .replace(/<li>([\s\S]*?)<li>([\s\S]*?)<\/li>([\s]*?)<\/li>/mg, function($0, text, subtext) {
               // TODO: better format nesting tag.
               // 不可嵌套（最内层） li 的表达式。
               ///<li>((?:(?!<\/?li>)[\s\S])*)<\/li>/
               // 嵌套一层（最内二层） li > li 的表达式。
               ///<li>((?:(?!<\/?li>)[\s\S]|(?:<li>((?:(?!<\/?li>)[\s\S])*)<\/li>))*)<\/li>/
               ///<li>((?:(?:<li>((?:(?!<\/?li>)[\s\S])*)<\/li>)|(?!<\/?li>)[\s\S])*)<\/li>/
               ///<li>((?:(?!<\/?li>)(?:[\s\S]|(?:<li>((?:(?!<\/?li>)[\s\S])*)<\/li>))*)<\/li>/
               return '* ' + text.replace(/\n/g, '\n  ') + '\n' +
                      '  * ' + subtext.replace(/\n/g, '\n    ');
             })
             // 替换 li
             .replace(/<li>([\s\S]*?)<\/li>/mg, function($0, text) {
               return '* ' + text.replace(/\n/g, '\n  ');
             })
             // 替换剩余的 <li>
             .replace(/<li>/g, '* ')
             .replace(/<\/li>/g, '')
             .replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/mg, function($0, url, text) {
               if (url.startsWith('#')) {
                 return `*${profix}${url.replace('#', '')}*`;
               }
               return url === text ? url : `*${profix}${url.replace(/\.html$/, '')}*`;
             })
             .replace(/<\/?em>/g, '__')
             .replace(/<\/?strong>/g, '**')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, '\'');
}

/**
 * Convert node api doc to vim doc.
 * @param {Object} content: the JSON object data of Node API doc.
 * @return {String} vim doc format string.
 */
exports.convertModule = function(content, nodeVersion) {
  if (!content.modules || !content.modules[0].methods) {
    return 'NOT A MODULE.';
  }
  const module = content.modules[0];

  // 方法列表
  const methods_toc = [];
  let methods_detail = '';
  module.methods.forEach(function(method, index) {
    methods_toc.push(`    2.${index + 1}. ${method.textRaw} [SPACE_HOLDER] |${profix}${module.name}.${method.name}()|`);
    methods_detail += `
------------------------------------------------------------------------------
${method.textRaw} [SPACE_HOLDER] *${profix}${module.name}.${method.name}()*

${html2vimdoc(method.desc)}
    `;
  });

  // 属性列表
  const properties_toc = [];
  let properties_detail = '';
  if (module.properties) {
    module.properties.forEach(function(property, index) {
      properties_toc.push(`    3.${index + 1}. ${property.textRaw} [SPACE_HOLDER] |${profix}${module.name}.${property.name}|`);
      properties_detail += `
------------------------------------------------------------------------------
${property.textRaw} [SPACE_HOLDER] *${profix}${module.name}.${property.name}*

${html2vimdoc(property.desc)}
      `;
    });
  }

  let vimdoc = `*${profix}${module.name}.txt*      For Node.js module \`${module.textRaw}\` version ${nodeVersion}.


Node.js Documentation
https://nodejs.org

==============================================================================
CONTENTS [SPACE_HOLDER] *${profix}contents*

  1. Intro [SPACE_HOLDER] |${profix}${module.name}|
  2. Methods [SPACE_HOLDER] |${profix}${module.name}-methods|
${methods_toc.join('\n')}
  3. Properties [SPACE_HOLDER] |${profix}${module.name}-properties|
${properties_toc.join('\n')}

==============================================================================
INTRO [SPACE_HOLDER] *${profix}${module.name}*

Stability: ${module.stability} - ${module.stabilityText}

${html2vimdoc(module.desc)}

==============================================================================
METHODS [SPACE_HOLDER] *${profix}${module.name}-methods*

${methods_detail}

==============================================================================
PROPERTIES [SPACE_HOLDER] *${profix}${module.name}-properties*

${properties_detail}

 vim:tw=78:ts=8:ft=help`;

  return vimdoc.replace(/\n{3,}/g, '\n\n')
                // 替换空白占位符，保持 tag 有对齐。
               .replace(/^(.+)\[SPACE_HOLDER\](.+)$/mg, function($0, before, after) {
                 const space_count = 78 - before.length - after.length;
                 return before + (space_count > 0 ? ' '.repeat(space_count) : '') + after;
               });
};
