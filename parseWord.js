// 前段时间利用 mammoth 来解析 word文档，这个解析出来比较蛋疼，图片是 base64 ，并且图片超过三张根本解析不出来， 本身base64添加到cms反应时间比较慢。

// 研究一波压缩，代码 发现有坑，，， 嘻嘻嘻，还是通过
const cheerio = require('cheerio');
const fs = require("fs");
const iconv = require('iconv-lite');


fs.readFile('./sss/test.html',function (err,fileDdata) {
   if(err) throw err;
   let html = iconv.decode(fileDdata, 'gbk');
   let $ = cheerio.load(html,{
       decodeEntities: false,
       ignoreWhitespace: false,
       xmlMode: false,
       lowerCaseTags: false
   })
    console.log($('body').html().replace(/style=\"(.*?)\"|class=\"(.*?)\" /g, ""));
});