var http = require('http');
var express = require('express');
var app = express();
const port = 3000;
var mathjs = require('mathjs');
const TableName = 'stock';
var co = require('co')

async function selecter(params,res,db){
        console.log(params.toString());
        var func=params.get('function');
        (func=='addstock')?await addstock(params,res,db):
        (func=='checkstock')?await checkstock(params,res,db):
        (func=='sell')?await sell(params,res,db):
        (func=='checksales')?await checksales(params,res,db):
        (func=='deleteall')?deleteall(params,res,db):
        res.write('ERROR');
}

async function addstock(params,res,db){     
        try{
                var name = params.get('name');
                var amount = Number(mathjs.evaluate(params.get('amount')));
                //console.log(typeof amount,amount);
                if (Number.isInteger(amount)&params.has('name')){
                        var count = async function(){
                                return new Promise((resolve, reject) => {
                                        var order = `select count(*) from ${TableName} where name = ?`
                                        db.get(order,[name], (err, row) => {
                                        if (err) return reject(err)
                                        return resolve(row["count(*)"])
                                        })
                                })

                        }
                        name_check = await count();
                        console.log(name_check);
                        if(name_check==1){
                                console.log('update');
                                var order= `UPDATE ${TableName} SET amount = amount + ${amount} WHERE name = '${name}'`
                                await db.run(order,(error)=>{
                                        if(error){
                                                console.log(error)
                                                throw error;
                                        }
                                        console.log('hello')
                                })
                        }else if (name_check==0){
                                console.log('insert')
                                var order = `INSERT INTO ${TableName} (name, amount) VALUES (?,?)`
                                await db.run(order,[name,amount],(error)=>{
                                        if(error){
                                                console.log(error)
                                                throw error;
                                        }
                                })
                        }else{ throw error};
                }
                else{
                        throw error
                }
        } catch (error) {
                res.write('ERROR');
                console.log(error);
        }
        
}

async function checkstock(params,res,db){
        try{   
                if(params.has('name')){
                        console.log('mode1')
                        var name = params.get('name');
                        var order = `select * from ${TableName} where name = ?`;
                        var row = async function(){
                                return new Promise((resolve,reject)=>{
                                        db.serialize(()=>{
                                                db.get(order,name,function(error,row){
                                                        if(error){
                                                                throw error;
                                                        }
                                                        return resolve(row)
                                                        })
                                        })

                                })
                                
                        }
                        row = await row()
                        res.write(row.name + ': '+ row.amount.toString())
                        
                }else{
                        console.log('mode2')
                        var list = async function(){
                                return new Promise((resolve,reject)=>{
                                        db.serialize(()=>{
                                                var list =[];
                                                db.all(`select * from ${TableName}`,async function(error,rows){
                                                        rows.forEach(row =>{
                                                        list.push(row.name+': '+row.amount);
                                                        })
                                                        return(resolve(list))
                                                })
                                        })        
                                        //console.log(row.name+': '+row.amount.toString()+'\n');
                                        //res.write(row.name+': '+row.amount.toString()+'\n')
                                });
                        }
                        list = await list()
                        console.log(list)
                        for(i=0;i<list.length;i++){
                                res.write(list[i]+'\n')
                        }
                }
        }catch(error){
                console.log(error.message);
                res.write('ERROR');	
        }
};

async function sell(params,res,db){
        try{
                var name = params.get('name');
                if(params.has('amount')){
                        var amount = Number(mathjs.evaluate(params.get('amount')));
                }else{
                        var amount = 1;
                };
                
                if (Number.isInteger(amount)&name!==null){
                        
                        if(params.has('price')){
                                console.log('has price')
                                const price = Number(mathjs.evaluate(params.get('price')));
                                var order = `update stock set amount = amount - ${amount},
                                        sale = sale + ${price}*${amount} where name = '${name}'`;
                                db.run(order,(error)=>{
                                        if(error){throw error}
                                });
                        }else{
                                console.log('has no price')
                                var order = `update stock set amount = amount - ? where name = ?`;
                                db.run(order,[amount,name]);   
                        }
                }
                else{
                        res.write('ERROR');
                }
        } catch (error) {
                res.write('ERROR');
                console.log(error.message);
        }
        
}

async function checksales(params,res,db){
        var total = async function(){
                return new Promise((resolve,reject)=>{
                        var order = `SELECT TOTAL(sale) AS total FROM ${TableName} `
                        db.serialize(()=>{
                                db.get(order,(error,row)=>{
                                        if(error){
                                                console.log(error);
                                        } 
                                        return(resolve(row.total))
                                })
                        });
                })       
        }
        total = await total() 
        res.write('sales: '+ total.toString());
}

function deleteall(params,res,db){
        db.run(`delete from ${TableName}`)
}

app.get('/stocker',async function(req,res){
        //DBの立ち上げ接続
        var sqlite3 = require('sqlite3').verbose();
        const db = await new sqlite3.Database('./stock.sqlite3');
        var params = new URL(req.url,'http://localhost/').searchParams;
        db.run(`CREATE TABLE IF NOT EXISTS ${TableName} (name TEXT,amount INTEGER,sale INTEGER default 0)`);
        //functionの実行
        //res.end();
        await selecter(params,res,db);
        //selecter(param1,res,db);
        //selecter(param2,res,db);
        //selecter(param3,res,db);
        //selecter(param2,res,db);
        db.close();
        res.end();
});
app.listen(port);