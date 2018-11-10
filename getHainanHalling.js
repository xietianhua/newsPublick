// 第一步实现爬虫功能。
const axios = require('axios')
const fs = require('fs')
const cheerio = require('cheerio')


// 获取首页内容，制作数据源格式
let newsCollect = {
    workDynamicUrl: '',
    hotNewsUrl: '',
    NoticeUrl: '',
    cityNewsUrl: ''
}

let baseUrl = 'http://dost.hainan.gov.cn/'

function spider () {
    fs.mkdir('./saveHtml',err => console.log('创建文件夹失败'))
    return axios.post('http://dost.hainan.gov.cn/').then(response => {
        if (response.status === 200) {
            getNewsCollect(response.data).then((urlList) => {
                getLatestNewsListData(urlList)
            }).catch((error) => {
                console.log(error)
            })
        }
    }).catch(e => {
        console.log('爬虫失败了,请检查网络连接')
        console.log(e)
    })
}

spider()

function getNewsCollect (html) {
    $ = cheerio.load(html, {
        decodeEntities: false,
        ignoreWhitespace: false,
        xmlMode: false,
        lowerCaseTags: false
    })
    newsCollect['workDynamicUrl'] = $('#ab1').find('a').attr('href')
    newsCollect['hotNewsUrl'] = $('#ab2').find('a').attr('href')
    newsCollect['NoticeUrl'] = $('#ab3').find('a').attr('href')
    newsCollect['cityNewsUrl'] = $('#ab4').find('a').attr('href')
    return new Promise(function (resolve, reject) {
        if (newsCollect) {
            resolve(newsCollect)
        } else {
            reject('列表页获取失败')
        }
    })
}


function getLatestNewsListData (v) {
    // 循环遍历这个对象，取出url ，利用 axios去 获取列表数据
    for ( let key in v) {
        axios.post(baseUrl + v[key]).then((response) => {
            fs.writeFile( './saveHtml/' + key + 'List.xhtml', response.data,(err => console.log(err)))
        })

    }
}