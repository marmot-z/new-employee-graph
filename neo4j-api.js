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
        let nodes = await this.findNodesByProperty('JOB', 'name', nodeInfo.job);
        if (nodes.length === 0) {
            await this.createJobNode(nodeInfo.job);
        }

        await this.createNode('EMPLOYEE', nodeInfo);
        await this.createJobEmployeeRelation(nodeInfo.job, nodeInfo.name);
        await this.createEmployeeRelation(nodeInfo.name, nodeInfo);
    }

    async createNode(label, nodeInfo) {
        const session = this.driver.session({database: this.database});

        try {
            let statement = label === 'JOB' ?
                    Neo4jApi.CREATE_JOB_NODE_STATEMENT :
                    Neo4jApi.CREATE_EMPLOYEE_NODE_STATEMENT;

            await session.run(statement, nodeInfo);
            console.log(`创建了 ${nodeInfo.name} ${label}节点`);
        } catch(e) {
            console.error(e);
        } finally {
            await session.close();
        }
    }

    async findNodesByProperty(label, property, propertyVal) {
        const session = this.driver.session({database: this.database});

        try {
            let statement;
            if (Array.isArray(propertyVal)) {
                let condition = propertyVal.map(v => `'${v}' in n.${property}`).join(' or ');
                statement = `match(n:${label}) where ${condition} return n;`;
            } else {
                statement = `match(n:${label}{${property}: $propertyVal}) return n;`;
            }

            let result = await session.run(statement, {propertyVal});

            if (Array.isArray(result.records) && result.records.length > 0) {
                return result.records.map(r => {
                    return r._fields[0].properties;
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
            console.info(`新增 ${jobName} JOB节点-${employeeName} EMPLOYEE节点关系`);
        } catch(e) {
            console.error(e);
        } finally {
            await session.close();
        }
    }

    async createEmployeeRelation(name, properties) {
        if ('name' in properties) {
            delete properties.name;
        }
        if ('job' in properties) {
            delete properties.job;
        }

        for (let key in properties) {
            let val = properties[key];

            if (val) {
                await this._createEmployeeRelation(name, key, val);
            }
        }
    }

    async _createEmployeeRelation(name, property, propertyVal) {
        const session = this.driver.session({database: this.database});

        try {
            let result = await this.findNodesByProperty('EMPLOYEE', property, propertyVal);

            if (result.length > 0) {
                for (let item of result) {
                    if (item.name !== name) {
                        if (Array.isArray(propertyVal)) {
                            propertyVal = findIntersection(propertyVal, item[property]);
                        }

                        let statment = Neo4jApi.CREATE_EMPLOYEE_RELATION_STATEMENT.replace(/\$property\b/g, property)
                                .replace(/\$propertyUpper/g, property.toUpperCase());
                        await session.run(statment, {fromName: name, toName: item.name, propertyVal});
                        console.info(`为 ${name} EMPLOYEE节点新增{${property}:${propertyVal}}关系`);
                    }
                }
            }
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
    merge (to)-[:SIMILAR_$propertyUpper{$property: $propertyVal}]->(from)';

function findIntersection(arr1, arr2) {
    if (arr1.length === 0 || arr2.length === 0) {
        return [];
    } 

    return arr1.filter(i => arr2.indexOf(i) > -1);
}

let option = {
    host: process.env.NEO4J_HOST,
    port: process.env.NEO4J_PORT,
    user: process.env.NEO4J_USERNAME,
    password: process.env.NEO4J_PASSWORD,
    database: 'neo4j'
};

(async () => {
    let api = new Neo4jApi(option);

    let nodeInfo1 = {
        job: '运营实习生',
        name: '毛硕晴',
        sex: '女',
        age: 24,
        hometown: '北京',
        school: '',
        hobby: ['摄影', '看比赛', '户外活动', '听歌']
    };
    let nodeInfo2 = {
        job: '运营实习生',
        name: '董博宇',
        sex: '男',
        age: 24,
        hometown: '哈尔滨',
        school: '',
        hobby: ['听歌', '看剧', '看电影', '散步']
    };

    try {
        await api.createEmployeeNode(nodeInfo1);
        await api.createEmployeeNode(nodeInfo2);
    } finally {
        api.close();
    }
})();