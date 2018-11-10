const mammoth = require('mammoth');
const cheerio = require('cheerio');
const fs =  require("fs");

mammoth.extractRawText({path: './originText/cn.docx'})
    .then(function (result) {
        var text = result.value // The raw text
        // 将数据处理成[{title:"",content:"",source:""}]的形式
        // text = text.replace(/海南ip新闻|中国ip新闻|国际ip新闻|今日知识产权评论|评论员 科欣/, '').split(/[0-9]\s*\.\s+/g);
        text = text.replace(/中国ip新闻/, '');
        text = text.replace(/国际ip新闻/, '');
        text = text.replace(/海南ip新闻/, '');
        text = text.replace(/今日知识产权评论/, '');
        text = text.replace(/评论员 科欣/, '');
        text = text.split(/[0-9]\s*\.\s+/g);
        let rsData = []
        text.forEach((i) => {
            i = i.split(/\n{2}/).filter((o) => o !== '')
            if (i.length >= 3) {
                let reg = /—{1,}/
                let srcT = i[i.length - 1]
                let title = i[0]
                if (reg.test(srcT)) {
                    i.splice(0, 1)
                    i.splice(i.length - 1, i.length)
                    rsData.push({
                        'title': title,
                        'content': i.join(','),
                        'source': srcT
                    })
                } else {
                    rsData.push({
                        'title': title,
                        'content': i.join(','),
                        'source': ''
                    })
                }
            } else {
                return false
            }
        })
        return rsData
    })
    .then((rsData) => {
        let text = "";
        if (rsData.length) {
            rsData.forEach((item) => {
                text += `
         <p class="subNews">
            <p>
                <span class="news-subTitle">
                    ${item.title}
                </span>
            </p>
            <p style="text-indent: 2em;">
                <span style="text-indent: 2em;">
                    ${item.content}
                </span>
            </p>
            <p style="text-indent: 2em; text-align: right;">${item.source}</p>
         </p>
          `
            })
        }
        return text = `<div class='auto_content'> ${text}</div>`

    })
    .then((text) => {
        mammoth.convertToHtml({path: './originText/cn.docx'})
            .then((data) => {
                let xml = data;
                return {text, xml}
            })
            .then(({text, xml}) => {
                //  发现插件 bug 图片只能保存bs64格式两张，超过三张则会解析错误，目前按照日常一张去处理。
                let $1 = cheerio.load(xml.value, {
                    decodeEntities: false,
                    ignoreWhitespace: false,
                    xmlMode: false,
                    lowerCaseTags: false
                });
                let $2 = cheerio.load(text, {
                    decodeEntities: false,
                    ignoreWhitespace: false,
                    xmlMode: false,
                    lowerCaseTags: false
                });
                let matchtext = $1('img').parent().prev().text();
                let imgElement = $1.html($1('img'));
                $2.html($2('span').filter(function (i, el) {
                    return $2(this).text().trim() === matchtext
                }).parent().after(`<p>${imgElement}</p>`));
                  return $2.html($2('.auto_content'))
            }).then((storehtml)=>{
            fs.readFile('./intellectualNews/cn/index.html','utf-8',function(error,data){
                    let $r= cheerio.load(data, {decodeEntities: false,});
                    $r('#content').html(storehtml);
                    fs.writeFile('./intellectualNews/cn/index.html',$r.html(),function () {
                        if(error){
                            return console.log(error);
                        }else{
                            console.log("创建成功")
                        }
                    });
                })
        })
    });


mammoth.extractRawText({path: './originText/en.docx'})
    .then(function (result) {
        var text = result.value // The raw text
        // 将数据处理成[{title:"",content:"",source:""}]的形式
        // text = text.replace(/海南ip新闻|中国ip新闻|国际ip新闻|今日知识产权评论|评论员 科欣/, '').split(/[0-9]\s*\.\s+/g);
        text = text.replace(/Hainan\s*IP\s*news/gi, '');
        text = text.replace(/China\s*IP\s*news/gi, '');
        text = text.replace(/International\s*IP\s*news/gi, '');
        text = text.replace(/IP\s*Comments\s*Today/gi, '');
        text = text.replace(/Commentator:\s*Ke\s*Xin/gi, '');
        text = text.replace(/--/g, '——');
        text = text.split(/[0-9]\s*\.\s*\n+/g);
        let rsData = []
        text.forEach((i) => {
            i = i.split(/\n{2}/).filter((o) => o !== '')
            if (i.length >= 3) {
                let reg = /—{1,}/
                let srcT = i[i.length - 1]
                let title = i[0]
                if (reg.test(srcT)) {
                    i.splice(0, 1)
                    i.splice(i.length - 1, i.length)
                    rsData.push({
                        'title': title,
                        'content': i.join(','),
                        'source': srcT
                    })
                } else {
                    rsData.push({
                        'title': title,
                        'content': i.join(','),
                        'source': ''
                    })
                }
            } else {
                return false
            }
        })

        return rsData
    })
    .then((rsData) => {
        let text = "";
        if (rsData.length) {
            rsData.forEach((item) => {
                text += `
         <p class="subNews">
            <p>
                <span class="news-subTitle">
                    ${item.title}
                </span>
            </p>    
            <p style="text-indent: 2em;">
                <span style="text-indent: 2em;">
                    ${item.content}
                </span>
            </p>
            <p style="text-indent: 2em; text-align: right;">${item.source}</p>
         </p>
          `
            })
        }
        return text = `<div class='auto_content'>${text}</div>`

    })
    .then((text) => {
        mammoth.convertToHtml({path: './originText/en.docx'})
            .then((data) => {
                let xml = data
                return {text, xml}
            })
            .then(({text, xml}) => {
                //  发现插件 bug 图片只能保存bs64格式两张，超过三张则会解析错误，目前按照日常一张去处理。
                let $1 = cheerio.load(xml.value, {
                    decodeEntities: false,
                    ignoreWhitespace: false,
                    xmlMode: false,
                    lowerCaseTags: false
                });
                let $2 = cheerio.load(text, {
                    decodeEntities: false,
                    ignoreWhitespace: false,
                    xmlMode: false,
                    lowerCaseTags: false
                });
                let matchtext = $1('img').parent().prev().text();

                let imgElement = $1.html($1('img'));
                $2.html($2('span').filter(function (i, el) {
                    return $2(this).text().trim() === matchtext
                }).parent().after(`<p>${imgElement}</p>`));
                return $2.html($2('.auto_content'))
            }).then((storehtml)=>{
            fs.readFile('./intellectualNews/en/index.html','utf-8',function(error,data){
                let $r= cheerio.load(data, {decodeEntities: false,});
                $r('#content').html(storehtml);
                fs.writeFile('./intellectualNews/en/index.html',$r.html(),function () {
                    if(error){
                        return console.log(error);
                    }else{
                        console.log("创建成功")
                    }
                });
            })
        })
    });





