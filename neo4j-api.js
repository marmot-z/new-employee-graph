const { filter } = require('cheerio/lib/api/traversing');
const neo4j = require('neo4j-driver');

class Neo4jApi {
    constructor(option) {
        let uri = 'bolt://' + option.host + ':' + option.port;
        this.database = option.database;
        this.driver = neo4j.driver(uri, neo4j.auth.basic(option.user, option.password));
    }

    async createJobNode(name) {
        this.createNode('JOB', {name});
    }

    async createEmployeeNode(nodeInfo) {
        let nodes = await this.findNodesByName('JOB', nodeInfo.job);
        if (nodes.length === 0) {
            await this.createNode('JOB', nodeInfo.job);
        }

        await this.createNode('EMPLOYEE', nodeInfo);
        await this.createJobEmployeeRelation(nodeInfo.job, nodeInfo.name);
        await this.createEmployeeRelation();
    }

    async createNode(label, nodeInfo) {
        const session = this.driver.session({database: this.database});

        try {
            let statement = label === 'JOB' ?
                    Neo4jApi.CREATE_JOB_NODE_STATEMENT :
                    Neo4jApi.CREATE_EMPLOYEE_NODE_STATEMENT;

            await session.run(statement, nodeInfo);
        } catch(e) {
            console.error(e);
        } finally {
            await session.close();
        }
    }

    async findNodesByName(label, name) {
        const session = this.driver.session({database: this.database});

        try {
            let statement = `match(n:${label}{name: '${name}'}) return n;`;
            let result = await session.run(statement, {});

            if (Array.isArray(result.records) && result.records.length > 0) {
                return result.records.map(r => {
                    return r.__fields[0].properties;
                });
            }

            return [];
        } catch(e) {
            console.error(e);
        } finally {
            await session.close();
        }
    }

    async createJobEmployeeRelation(jobName, employeeName) {
        const session = this.driver.session({database: this.database});

        try {
            await session.run(Neo4jApi.CREATE_JOB_EMPLOYEE_RELATION_STATEMENT, {jobName, employeeName});
        } catch(e) {
            console.error(e);
        } finally {
            await session.close();
        }
    }

    async createEmployeeRelation(name, properties) {
        // let statement = 'match(n) where ';

        // let queryCondition = Object.keys(properties)
        //     .filter(key => {
        //         let val = properties[key];
        //         return typeof val !== 'undefined' && 
        //             typeof val !== null && 
        //             (Array.isArray(val) ? 
        //                 val.length > 0 :
        //                 typeof val === 'string' ? 
        //                     val.trim() !== '' :
        //                     true);
        //     })
        //     .map(key => {
        //         let val = properties[key];
        //         let wrapper = (v) => typeof wrapper === 'number' ? v : `'${v}'`;
        //         return Array.isArray(val) ? 
        //                 '(' + val.map(wrapper).join(' or ') + ')' :
        //                 wrapper(val);
        //     })
        //     .join(' and ');
        // statement += queryCondition + ' '

        // let keys = Object.keys(properties)
        //     .filter(key => {
        //         let val = properties[key];
        //         return 
        //     });

        // let nonNull = (val) => {
        //     typeof val !== 'undefined' && 
        //         typeof val !== null && 
        //         (Array.isArray(val) ? 
        //             val.length > 0 :
        //             typeof val === 'string' ? 
        //                 val.trim() !== '' :
        //                 true);
        // };
        // for (let key in properties) {
        //     if (nonNull.call(null, val)) {
        //         await this._createEmployeeRelation(key, properties[key])
        //     }
        // }

        // 根据hobby查询对应的节点
        // 创建当前节点和目标节点的对应关系
    }

    async _createEmployeeRelation(proerty, propertyVal) {
        const session = this.driver.session({database: this.database});

        try {
            let statment = Neo4jApi.CREATE_EMPLOYEE_RELATION_STATEMENT.replace(/$property/g, proerty)
                            .replace(/$$propertyUpper/g, proerty.toUpperCase());
            await session.run(statment, {propertyVal});
        } catch(e) {
            console.error(e);
        } finally {
            await session.close();
        }
    }

    async close() {
       await this.driver.close();
    }
}

Neo4jApi.CREATE_JOB_NODE_STATEMENT = 'create (p:JOB{name: $name})';
Neo4jApi.CREATE_EMPLOYEE_NODE_STATEMENT = 'create (\
    p:EMPLOYEE {\
        name: $name, \
        sex: $sex, \
        age: $age, \
        hometown: $hometown, \
        school: $school, \
        hobby: $hobby \
    })';
Neo4jApi.CREATE_JOB_EMPLOYEE_RELATION_STATEMENT = 'match (a:JOB{name: $jobName}), (b:EMPLOYEE{name: $employeeName}) \
    create (a)-[:PROFESSION]->(b);';
Neo4jApi.CREATE_EMPLOYEE_RELATION_STATEMENT = 'match (from:EMPLOYEE{name: $fromName}), (to:EMPLOYEE{name: $toName}) \
    create (from)-[:SIMILAR_$propertyUpper{$property: $propertyVal}]->(to)';

let option = {
    host: '101.34.168.17',
    port: 7687,
    user: 'neo4j',
    password: 'zxw123',
    database: 'neo4j'
};

(async () => {
    let api = new Neo4jApi(option);

    let nodeInfo = {
        job: '运营实习生',
        name: '毛硕晴',
        sex: '女',
        age: -1,
        hometown: '北京',
        school: '',
        hobby: ['摄影', '看比赛', '户外活动']
    };
    // await api.createNode(nodeInfo);
    // await api.createJobNode({name: '运营实习生'});
    await api.findNodeByName('JOB', '运营实习生');
    api.close();
})();