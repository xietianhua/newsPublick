// 第一步实现爬虫功能。
const axios = require('axios');
const fs = require('fs');
const qs = require('qs');
const schedule = require('node-schedule');
const cheerio = require('cheerio');


// 获取首页内容，制作数据源格式
let newsCollect = {
    workDynamicUrl: '',
    hotNewsUrl: '',
    NoticeUrl: '',
    cityNewsUrl: ''
}

let baseUrl = 'http://dost.hainan.gov.cn/'

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
        console.log('爬虫失败了,请检查网络连接')
        console.log(e)
    })
}

// spider()

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


function getLatestNewsListData(v) {
    // 循环遍历这个对象，取出url ，利用 axios去 获取列表数据
    for (let key in v) {
        axios.post(baseUrl + v[key]).then((response) => {
            fs.writeFile('./saveHtml/' + key + 'List.html', response.data, (err => console.log(err)))
        })
    }

}

// 详情页面信息获取。
function getDetailData() {
    axios.get('http://dost.hainan.gov.cn/art/2018/11/11/art_415_92836.html').then((response) => {
        fs.writeFile('./saveHtml/detail.html', response.data, (err => console.log(err)));
        $ = cheerio.load(response.data, {
            decodeEntities: false,
            ignoreWhitespace: false,
            xmlMode: false,
            lowerCaseTags: false,
        });
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
        bean['userId'] =id;
        console.log(bean)
        let param = {bean:JSON.stringify(bean)};
        axios.post('http://hainanip.hist.gov.cn/hn_cms/api/admin/add/news?',qs.stringify(param),{
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((response)=>{
            console.log("新增接口调用成功");
        }).catch(e => {
            console.log("新增接口调用失败");
        })
    }).catch(e => {
        console.log(e)
    })
}


// play schedule

console.log("我要研究node里面的定时任务了");

// 设置每天 8:00  10:00  12:00 18:00
schedule.scheduleJob('45 05 8 * * *', function(){
    spider()
});

schedule.scheduleJob('20 30 10 * * *', function(){
    spider()
});

schedule.scheduleJob('15 30 12 * * *', function(){
    spider()
});

schedule.scheduleJob('45 05 15 * * *', function(){
    spider()
});

schedule.scheduleJob('45 05 18 * * *', function(){
    spider()
});



