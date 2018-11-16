// 整体思路：通过首页获取 新闻列表页 ，通过列表页获取当天的新闻详情页(如果当天没有新闻详情页，就直接跳出程序。
const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const qs = require('qs');

// 获得今日日期的方法
function getTodayData() {
    let d = new Date();
    let today = d.getFullYear() + '-' + ((d.getMonth() + 1) < 10 ? '0' + (d.getMonth() + 1) : (d.getMonth() + 1)) + '-' + (d.getDate() < 10 ? '0' + (d.getDate()) : d.getDate());
    return today
}

// 获取首页内容，制作数据源格式
let newsCollect = {
    workDynamicUrl: '',
    hotNewsUrl: '',
    NoticeUrl: '',
    cityNewsUrl: ''
};


let baseUrl = 'http://dost.hainan.gov.cn/';

function loginSystem() {
    const data = {
        username: "admin",
        password: "admin"
    };
    axios.post('http://hainanip.hist.gov.cn/hn_cms/api/user/login/pwd', qs.stringify(data), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then((response) => {
        let {accessToken, id} = response.data.data.rsData[0];
        global.accessToken = accessToken;
        global.id = id;
        spider()
    })
}


loginSystem();  // 系统登录以后 才 默认执行一些操作。

function spider() {
    fs.mkdir('./saveHtml', err => console.log('创建文件夹失败'))
    return axios.post('http://dost.hainan.gov.cn/').then(response => {
        if (response.status === 200) {
            getNewsCollect(response.data).then((urlList) => {
                getLatestNewsListData(urlList)
            }).catch((error) => {
                console.log(error)
            })
        }
    }).catch(e => {
        console.log('爬虫失败了,请检查网络连接');
        console.log(e)
    })
}
function getNewsCollect(html) {
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
}  // 获取列表页集合。


// 整个执行完成以后，在执行 fs.readFile
function getLatestNewsListData(v) {
    for (let key in v) {
        let detailUrl = [];
        axios.post(baseUrl + v[key]).then((response) => {
            let $ = cheerio.load(response.data, {
                decodeEntities: false,
                ignoreWhitespace: false,
                xmlMode: false,
                lowerCaseTags: false
            });
            let html = $('#123').children().html().replace(/<\!\[CDATA\[/g, '').replace(/\]\]>/g, '');
            $ = cheerio.load(html.toString(), {
                decodeEntities: false,
                ignoreWhitespace: false,
                xmlMode: true,
                lowerCaseTags: false
            })
            for (let i = 0; i < $('tr').length; i++) {
                let strTime = $('tr').eq(i).children().last().text().replace(/\[|\]/g, '')
                if (strTime === getTodayData()) {
                    detailUrl.push($('tr').eq(i).children().first().find('a').attr('href'))
                } else {
                    break  // 优化新能，新闻按照时间从新到就排序，不是今天的新闻直接pass
                }
            }
            return detailUrl
        }).then((detailUrl) => {
            // 先读取这个 js 文件
            fs.readFile('recode.txt', function (err, fileData) {
                if (err) throw err;
                let arr = fileData.toString().split(',').filter(it => it).map((o) => {
                    return "http://dost.hainan.gov.cn" + o
                });
                detailUrl.forEach((url, index) => {
                    url = "http://dost.hainan.gov.cn" + url;
                    console.log(url);
                    console.log(arr.indexOf(url) !== -1);
                    console.log(arr.length);
                    if (arr.indexOf(url) !== -1 || !arr.length) {
                        console.log("这条新闻已经被爬取过了，不需要在爬取了！")
                    } else {
                        getDetailData(url)
                    }
                });
                if (detailUrl && detailUrl.length) {
                    fs.appendFile('recode.txt', "," + detailUrl, (err) => {
                        console.log(err)
                    });
                }
            });
        })
    }
}
// 判断



// 详情页面信息获取。
function getDetailData(url) {
    axios.get(url).then((response) => {
        $ = cheerio.load(response.data, {
            decodeEntities: false,
            ignoreWhitespace: false,
            xmlMode: false,
            lowerCaseTags: false,
        });
        for (let i = 0; i < $('#zoom').find('a').length; i++) {
            $('a', '#zoom').eq(i).attr('href', baseUrl + $('a', '#zoom').eq(i).attr('href'))
        }
        // 循环 img 为img标签src属性增加前缀
        for (let i = 0; i < $('#zoom').find('img').length; i++) {
            $('img', '#zoom').eq(i).attr('src', baseUrl + $('img', '#zoom').eq(i).attr('src'))
        }
        // 形成后台所需要的bean
        let title = $('.xwlb').children('table').find('tr').eq(1).text();
        let nowData = new Date();
        // 判断生成 type parType，parType 是大类,type 是子类。
        let identifier = $('table').eq(1).find("a").last().text().trim();
        let bean = {
            title: title.replace(/\n/g, '').trim(),
            abs: $('#zoom').text().replace(/\n/g, '').trim() || title,
            province: 25,
            status: 1,
            publicTime: nowData.valueOf(),
            content: $('#zoom').html().replace(/\n/g, '').trim(),
            source: $('.llcs').next().text().replace(/信息来源：/g, '') || "海南省科技厅"
        };
        if (["工作动态", '媒体聚焦', '市县科技'].indexOf(identifier) === -1) {
            bean['parType'] = "通知公告"
        } else {
            bean['parType'] = "新闻动态";
            bean['type'] = identifier;
        }
        return bean
    }).then((bean) => {
        callTnterface(bean)
    })
}

function callTnterface(bean) {
    let param = {bean: JSON.stringify(bean)};
    axios.post('http://hainanip.hist.gov.cn/hn_cms/api/admin/add/news?userId=' + global.id + '&token=' + global.accessToken, qs.stringify(param), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then((response) => {
        console.log("新增接口调用成功");
    }).catch(e => {
        console.log("新增接口调用失败");
    })
}

