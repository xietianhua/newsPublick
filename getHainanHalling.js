// 整体思路：通过首页获取 新闻列表页 ，通过列表页获取当天的新闻详情页(如果当天没有新闻详情页，就直接跳出程序。
const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const qs = require('qs');


// 获得今日日期的方法
function getTodayData() {
    let d = new Date()
    let today = d.getFullYear() + '-' + ((d.getMonth() + 1) < 10 ? '0' + (d.getMonth() + 1) : (d.getMonth() + 1)) + '-' + (d.getDate() < 10 ? '0' + (d.getDate()) : d.getDate())
    return today
}

// 获取首页内容，制作数据源格式
let newsCollect = {
    workDynamicUrl: '',
    hotNewsUrl: '',
    NoticeUrl: '',
    cityNewsUrl: ''
}
let counter = 0;
let baseUrl = 'http://dost.hainan.gov.cn/';



function spider () {
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
        console.log('爬虫失败了,请检查网络连接')
        console.log(e)
    })
}
spider()

spider();

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
}

// 整个执行完成以后，在执行 fs.readFile
function getLatestNewsListData(v) {
    for (let key in v) {
        axios.post(baseUrl + v[key]).then((response) => {
            fs.writeFile('./saveHtml/' + key + 'List.html', response.data, (err => {}))
            counter++
            if (counter === 4) {   // 这是让前面函数完成的做法
                setTimeout(getNewsDetailUrl,3000)
            }
        })
    }

}

function getNewsDetailUrl() {
    let detailUrl = [], counterDouble = 0 // 先用一个数组保存符合条件的详情连接，具体属于哪个类别下面，爬取详情页面的时候再做考虑。
    for (let key in newsCollect) {
        fs.readFile('./saveHtml/' + key + 'List.html', function (err, fileData) {
            counterDouble++
            $ = cheerio.load(fileData.toString(), {
                decodeEntities: false,
                ignoreWhitespace: false,
                xmlMode: true,
                lowerCaseTags: false
            });
            let html = $('#123').children().html().replace(/<\!\[CDATA\[/g, '').replace(/\]\]>/g, '');
            $ = cheerio.load(html);
            console.log($('tr').length)
            for (let i = 0; i < $('tr').length; i++) {
                let strTime = $('tr').eq(i).children().last().text().replace(/\[|\]/g, '')
                if (strTime === getTodayData()) {
                    detailUrl.push($('tr').eq(i).children().first().find('a').attr('href'))
                } else {
                    break  // 优化新能，新闻按照时间从新到就排序，不是今天的新闻直接pass
                }
            }
            if (counterDouble === 4) {
                console.log(detailUrl);
                // getDetailMessage(detailUrl)
            }
        })
    }
}

function getDetailMessage(detailUrl) {
    if (detailUrl.length) {
        let reg = RegExp(/http:\/\/dost.hainan.gov.cn\//g)
        detailUrl.forEach((url) => {
            url = reg.test(url) ? url : baseUrl + url;
            getDetailData(url)
        })
    } else {
        console.log(getTodayData() + "海南科技网站的新闻没有新的内容！")
    }
}

// 详情页面信息获取。
function getDetailData(url) {
    axios.get(url).then((response) => {
        fs.writeFile('./saveHtml/detail.html', response.data, (err => console.log(err)));
        $ = cheerio.load(response.data, {
            decodeEntities: false,
            ignoreWhitespace: false,
            xmlMode: false,
            lowerCaseTags: false,
        });
        // 循环为所有的 a 标签 加上前缀，不然下载不了附件。
        console.log($('#zoom').find('a').length);
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
    // 调用登陆接口，获取token;
    const data = {
        username: "admin",
        password: "admin"
    };
    axios.post('http://hainanip.hist.gov.cn/hn_cms/api/user/login/pwd', qs.stringify(data), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then((response) => {
        console.log("登陆接口调用成功");
        let {accessToken, id} = response.data.data.rsData[0];
        bean['token'] = accessToken;
        bean['userId'] = id;
        // console.log(bean)
        let param = {bean: JSON.stringify(bean)};
        axios.post('http://hainanip.hist.gov.cn/hn_cms/api/admin/add/news?userId=' + id + '&token=' + accessToken, qs.stringify(param), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response) => {
            console.log("新增接口调用成功");
        }).catch(e => {
            console.log("新增接口调用失败");
        })
    }).catch(e => {
        console.log(e)
    })
}