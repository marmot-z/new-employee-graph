class Formatter {
    constructor(schema) {
        this.schema = schema;
    }

    format(sheet) {
        let data = sheet.data;
        if (data.length === 0) {
            return [];
        }

        this.convertTitle2FieldName(data[0]);

        let result = [];
        for (let i = 1, lenght = data.length; i < lenght; i++) {
            let row = data[i];

            if (!row) continue;
            
            let obj = {};
            for (let j = 0, l = row.length; j < l; j++) {
                if (this.keys[j]) obj[this.keys[j]] = row[j];
            }

            result.push(obj);
        }

        return result;
    }

    convertTitle2FieldName(titles) {
        this.keys = titles.map(t => this.schema[t]);
    }
}

module.exports = Formatter;