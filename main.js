const {mailTool} = require('./wecom-email');

(async () => {
    await mailTool.downloadAttachment({}, 'May 20, 2021', 'Sep 20, 2021');
})();