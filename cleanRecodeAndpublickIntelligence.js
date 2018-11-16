const axios = require('axios');
const fs = require('fs');
const cheerio = require('cheerio');
const qs = require('qs');


// 清空文件夹
fs.writeFileSync('./recode.txt', '');

let baseUrl = "http://mhk.kechuang.cn/wap/cn/";  // 清空前一天的文件。

function loginSystem() {
    const data = {
        username: "admin",
        password: "admin"
    };
    axios.post(getTodayIntelligenceNewsUrl(), qs.stringify(data), {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    }).then((response) => {
        let {accessToken, id} = response.data.data.rsData[0];
        global.accessToken = accessToken;
        global.id = id;
        publicIntellectualNews()
    })
}

loginSystem();


function publicIntellectualNews() {
    axios.get('http://mhk.kechuang.cn/wap/cn/index181114.html').then((response) => {
        let $ = cheerio.load(response.data.toString(),{
            decodeEntities: false,
            ignoreWhitespace: false,
            xmlMode: false,
            lowerCaseTags: false
        });
        $('img').remove();
        let nowData = new Date();
        let bean = {
            title: $('.news-subTitle').eq(0).text().trim(),
            abs: $('span').eq(2).text().trim() || title,
            province: 25,
            status: 1,
            parType:"新闻动态",
            type:"今日知识产权",
            publicTime: nowData.valueOf(),
            content:$('.auto_content').html().replace(/\n|\s/g, '').trim(),
            source: "海南省科技厅"
        };
        return bean
    }).then((bean)=>{
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
    })
}

// 生成每天今日知识产权的跳转链接。
function getTodayIntelligenceNewsUrl() {
    let d = new Date();
    let urlTail =""+d.getFullYear()+ ((d.getMonth() + 1) < 10 ? '0' +""+(d.getMonth() + 1) : (d.getMonth() + 1))+""+(d.getDate() < 10 ? '0' + (d.getDate()) : d.getDate());
    let a =  urlTail.replace(/^[\d]{2}/g,"");
    return  baseUrl+a
}


