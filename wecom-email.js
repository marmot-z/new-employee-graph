const Imap = require('imap');
const MailParser = require("mailparser-mit").MailParser;
const fs = require("fs");
const Path = require("path")
const pathPrefix = Path.join(__dirname, '../uploads/')

exports.mailTool = {
    downloadAttachment: (user, start, end) => {
        return new Promise((resolve, reject) => {
            //构建一个Imap
            let imap = new Imap({
                user: process.env.EMAIL_USERNAME, //你的邮箱账号
                password: process.env.EMAIL_PASSWORD, //你的邮箱密码
                host: 'imap.exmail.qq.com', //邮箱服务器的主机地址 以腾讯企业邮箱为例子
                port: 993, //邮箱服务器的端口地址
                tls: true, //使用安全传输协议
                tlsOptions: {rejectUnauthorized: false} //禁用对证书有效性的检查
            });
            
            //imap 就绪事件 的 回调
            imap.once('ready', function () {
                //首先获取BoxList，这关系到你要读取哪个邮箱，此处回调函数比较阴间，第一个参数是err，第二个才是boxes
                imap.getBoxes('', (err, res) => {
                    console.log("获取所有信箱")
                    console.log(Object.keys(res))
                })
                    
                //打开一个box，收件箱是INBOX，这里我是打开的发件箱
                imap.openBox('INBOX', true, function (err, box) {

                    console.log("打开邮箱")

                    if (err) throw err;
                    //这里就是阴间的 search条件了。具体参考node-imap的文档，flag可选项在box对象的flags里看
                    //已知 SINCE + BEFORE是能识别的，日期格式支持好多种，目前在用yyyy-MM-dd
                    let searchParam =  [ ['HEADER', 'SUBJECT', '新人介绍'] ]
                    imap.search(searchParam, function (err, results) {
                        if (err) throw err;
                        // const f = imap.fetch(results, {bodies: ''});//抓取邮件
                        const f = imap.fetch(results, {
                            bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)', 'TEXT'],
                            struct: true
                          });

                        f.on('message', function (msg, seqNo) {

                            //这里就是我们的Parser了，亲测streamAttachments开了读到的流是空的，建议别开
                            let mailParser = new MailParser({
                                // streamAttachments: true
                            });

                            msg.on('body', async function (stream, info) {
                                stream.pipe(mailParser)

                                //邮件头内容
                                mailParser.on("headers", function (headers) {
                                    console.log("邮件头信息>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>");
                                    console.log("邮件主题: " + headers.subject);
                                    console.log("发件人: " + headers.from);
                                    console.log("收件人: " + headers.to);
                                    console.log("x-qq-mid: " + headers['x-qq-mid']); 
                                    console.log("date:" + headers.date)
                                });

                                //邮件内容

                                mailParser.on('end', async function (mail) {
                                    /*
                                    
                                        做一些判断，不满满足的就return
                                        
                                    */
                                    //从发件者中取第一位
                                    let sender = mail.from[0].address.match(/^.+(?=@)/).join('')
                                    let path = 'mail/' + sender
                                    let dir = await createDir(path)

                                    if (mail.attachments && mail.attachments.length > 0) {
                                        mail.attachments.forEach((data, i) => {
                                            //把主题和文件名拼起来，替换非法字符为_
                                            let filename = `${mail.subject}_${data.fileName}`.replace(/[\x00\/\\:*?"<>|]/g, '_')
                                            //把buffer存文件，注意使用附件文件的transferEncoding
                                            writeFile(dir, filename, data.content, data.transferEncoding)
                                        })
                                    }
                                })
                            });
                            msg.once('end', function () {
                                console.log(seqNo + '完成');

                            });
                        });
                        f.once('error', function (err) {
                            console.log('抓取出现错误: ' + err);

                        });
                        f.once('end', function () {
                            console.log('所有邮件抓取完成!');
                            imap.end();
                        });
                    });
                });
            });

            imap.once('error', function (err) {
                console.log(err);
                reject()
            });

            imap.once('end', function () {
                console.log('Connection ended');
                resolve()
            });
            
            //开始启动imap链接
            imap.connect()

        })
    },
    getUserName(username = '') {
        return username.match(/^.+(?=@)/).join('')
    },
    
}
function createDir(path) {
    let dir = pathPrefix + path + "/"
    return new Promise((resolve, reject) => {
        const exists = fs.existsSync(dir);
        if (!exists) {
            fs.mkdir(dir, {recursive: true},function (err) {
                if (err) {
                    reject(err);
                } else {
                    console.log(`目录创建${dir}成功。`);
                    resolve(dir)
                }
            });
        } else {
            resolve(dir)
        }
    })
}

function  writeFile(path,name,file,type = 'binary'){
    return fs.writeFileSync(path + name,file,{encoding:type});
}
