const xlsx = require('node-xlsx');
const Formatter = require('./formatter');

class Source {
    read() {}
}

class ExcelSource extends Source {
    constructor(excelPath, schema) {
        if (typeof excelPath === 'undefined' || !excelPath) {
            throw new Error('无效的excel路径');
        }

        super();
        this.excelPath = excelPath;
        this.schema = schema;
    }

    read() {
        let sheets = xlsx.parse(this.excelPath);
        let firstSheet = sheets[0];
        let formatter = new Formatter(this.schema);
        let arr = formatter.format(firstSheet);
        console.log(arr);
    }
}

let schema = {
    '姓名': 'name',
    '性别': 'sex',
    '年龄': 'age',
    '籍贯': 'hometown',
    '岗位': 'job',
    '兴趣': 'hobby',
    '毕业院校': 'school'
};
let source = new ExcelSource('/Users/zxw/Desktop/xinrenjieshao.xlsx', schema);
source.read();