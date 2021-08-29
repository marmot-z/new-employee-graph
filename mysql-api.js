const mysql = require('mysql');

class MySQLApi {
    constructor(connectOptions) {
        this.conn = mysql.createConnection(connectOptions);
        this.conn.connect();
    }

    async select(sql) {
        return new Promise((resolve, reject) => {
            this.conn.query(sql, function(err, result) {
                if (err) {
                    console.error(`Select occor a error: ${sql}`, err);
                    reject(err);
                    return;
                }

                resolve(result);
            })
        });
    }

    async insert(preparSql, args) {
        return new Promise((resolve, reject) => {
            this.conn.query(preparSql, args, function(err, result) {
                if (err) {
                    console.error(`Update occor a error: ${preparSql}`, err);
                    reject(err);
                    return;
                }

                resolve(result.insertId);
            });
        })
    }
}

module.exports = MySQLApi;

const options = {
    host: '192.168.200.59',
    port: '3306',
    user: 'yzs_role_middle',
    password: 'PybthubOkvekMoGru8shtoypCicis',
    database: 'yzs02'
};

(async () => {
    let operator = new MySQLOperater(options);
    let id = await operator.insert('INSERT INTO rbac_project(project_name, pk, creator) values(?, ?, ?)', ['role_middle', 'yzs-role-middle-test', 1]);
    console.log('Save successful:' + id);
    
    console.log(await operator.select('Select * from rbac_project'));
}) ();