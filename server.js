require("dotenv").config();
const express = require ("express");
const app = express()
const pool = require('./database')
const bcrypt = require('bcryptjs')
const PORT = process.env.PORT 
const cors = require("cors")
const jwt = require('jsonwebtoken')
const upload = require('./upload')

app.use(cors())
app.use(express.json())
app.use('/img', express.static('public/images'))

app.get('/',(req,res)=>{
    res.send("Hello")
})

app.get('/api/products',async(req,res)=>{
    const products = await pool.query(`SELECT * FROM "products"`)
    res.json(products.rows)
})
app.get('/api/products/productinfo', async (req,res)=>{
    try{
        const ID = req.query.ID
        const product = await pool.query(`SELECT * FROM "products" where "ID" = '${ID}'`)
        res.json(product.rows)
        console.log(req.query.ID)
    }
    catch(err){
        console.log(err)
    }
   
})


//show user cart
app.get("/api/usercart", async (req,res )=> {
    try{
         const ID = req.query.ID
        // const cartdata = (await pool.query(`SELECT * FROM "USER_CART" WHERE "USER_ID" = '${ID}'`)).rows
        // const getProductIds = cartdata.map((e)=>{ 
        //     return "'" + e.PRODUCT_ID + "'"
        //  })
        //  const idtoString = getProductIds.join(",")
        //  const getProductInfo =(await pool.query(`SELECT * FROM "products" WHERE "ID" IN (${idtoString});`)).rows
        //  const data = {}

         const getinnerJoin = (await pool.query(`
         SELECT * FROM "USER_CART"
         INNER JOIN "products"
         ON "USER_CART"."PRODUCT_ID" = "products"."ID" WHERE "USER_CART"."USER_ID" = '${ID}'`))
           
           
           
         res.json(getinnerJoin.rows)
       
        //console.log(getinnerJoin.rows)
       


        
        //console.log(outputdata)   
    } 
    catch(err){
      
        console.log(err.message)
    }
})

//remove product
app.delete("/api/remove", async (req,res )=> {
    try{
        const cart = req.query
        console.log(req.query)
        await pool.query(`delete from "USER_CART" where "PRODUCT_ID" = '${cart.PROD_ID}' and "USER_ID" = '${cart.ID}';`)
        console.log("deleted")
    }
    catch(err){
        console.log(err)
    }
})

//subtractcart

app.put("/api/subtractcart",async(req,res)=>{
    try{
        const userdata = req.body.params
        console.log(req.body.params)
        await pool.query(`UPDATE "USER_CART" SET "QUANTITY" = '${userdata.QUANTITY}' WHERE "USER_ID" = '${userdata.ID}' AND "PRODUCT_ID" = '${userdata.PROD_ID}';`)
        console.log("minus")
    }
    catch(err){
        console.log(err)
    }

})

app.put("/api/addcart",async(req,res)=>{
    try{    
        const userdata = req.body.params
        console.log(req.body.params)
        await pool.query(`UPDATE "USER_CART" SET "QUANTITY" = '${userdata.QUANTITY}' WHERE "USER_ID" = '${userdata.ID}' AND "PRODUCT_ID" = '${userdata.PROD_ID}';`)
        console.log("added")
    }
    catch(err){
        console.log(err)
    }

})

//add to cart
app.post("/api/addtocart", async (req,res )=> {
    try{
        const cart = req.body
        
        const hasdata = await pool.query(`SELECT * FROM "USER_CART" WHERE "USER_ID" = '${cart.userID}'`)
        const checkdata = hasdata.rows.map((data) =>{ return data.PRODUCT_ID})
        
        if(checkdata.includes(cart.productID)){

           
           const getquantity =  await pool.query(`SELECT "QUANTITY" FROM "USER_CART" WHERE "USER_ID" = '${cart.userID}' AND "PRODUCT_ID" ='${cart.productID}'`)
           const currentquantity = getquantity.rows.map((e)=>{ return e.QUANTITY})[0] + 1
           const currentStock = await pool.query(`SELECT "quantity" FROM "products" WHERE "ID" = '${cart.productID}' `)
           
           //seller supply
           const Supply = currentStock.rows.map((e)=>{ return e.quantity})[0]
           //add to cart demand
           const Demand = getquantity.rows.map((e)=>{ return e.QUANTITY})[0]
           if(Supply <= Demand ){
            res.json("Out of Stock")
           }
           else{
            await pool.query (`UPDATE "USER_CART" SET "QUANTITY" = '${currentquantity }' WHERE "PRODUCT_ID" = '${cart.productID}' AND "USER_ID"  = '${cart.userID}'`)
            res.json("Cart Updated")
           }
          
           
        }
        else{
            await pool.query (`INSERT INTO "USER_CART" ("PRODUCT_ID","USER_ID","QUANTITY", "DATE")
            VALUES ('${cart.productID}','${cart.userID}','${cart.quantity}','NOW()')`)
            res.json("Added to cart")
        }
       
        
        console.log(cart)
    } 
    catch(err){
       console.log("ss")
        console.log(err.message)
    }
})

app.post('/api/products', upload.single('avatar'),async(req,res)=>{
    console.log("Success")
    const products = await pool.query(`SELECT * FROM "products"`)
     res.json(products.rows)
})


app.get('/api/users',async (req,res)=>{
    const users = await pool.query(`SELECT * FROM "USER_INFO"`)
    res.json(users.rows)
})



app.get('/login', async (req,res)=>{
    try{
        console.log("Working")
        const login_data = req.query 
        const user = {email: login_data.Email}
        const fetchdata = await pool.query(`SELECT "EMAIL", "PASSWORD","CONTACT_NUM","ID" FROM "USER_INFO" WHERE "EMAIL" = '${login_data.Email}'`)
        if(fetchdata.rows.length == 0){
            res.status(200).json(`not registered`)

        } 

        else{
            const UserData = fetchdata.rows[0]
            const validpass = await bcrypt.compare(login_data.Password , UserData.PASSWORD)
            if(validpass){
                const userID = fetchdata.rows.map((e)=>{return e.ID})
                const signiture = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
                res.status(200).json({accessToken : signiture, ID:userID[0]})
                console.log(userID[0])
            }
            else{
                res.status(200).json("Invalid")
            }
        }  
    }
    catch(err){
        console.log(err.message)
    }
})

function authenticateToken(req,res,next){
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1] 
    console.log(authHeader)

    if (token == null){
        return res.sendStatus(401)
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,user) => {
        if(err) return res.sendStatus(403)
        req.user =user 
        next()
    })
}



app.get("/userdata",authenticateToken, async (req,res) => {
    try{
        const data = (await pool.query(`SELECT * FROM "USER_INFO"`)).rows
        res.json(data.filter (data=> data.EMAIL === req.user.email ))
    }
    catch(err){
        console.log(err.message)
    }
})

app.put("/update-user-information",async(req,res)=>{
    try{
        const update_data = req.body
        const data = (await pool.query(`UPDATE "USER_INFO" SET "F_NAME" = '${update_data.Fname}', "L_NAME" = '${update_data.Lname}',"ADDRESS" = '${update_data.Address}',"CONTACT_NUM" = '${update_data.Contact}' WHERE "ID" = '${update_data.ID}'`))
        const signiture = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
        res.status(200).json({accessToken : signiture})
        res.json(update_data)
    }
    catch(err){
        res.json(req.body)
        console.log(err.message)
    }

})


app.post("/register", async(req,res)=>{
    try{
        const reg_data = req.body
        const hash = await bcrypt.hash(reg_data.Password,10) 

        const getEmailData = await pool.query(`SELECT "EMAIL" FROM "USER_INFO"`) 
        const isExisiting = getEmailData.rows.map((data)=>{
            return data.EMAIL.toLowerCase()
        })
        if(isExisiting.includes(reg_data.Email.toLowerCase())){
            res.json("false")
        }
        else{
            await pool.query(`INSERT INTO "USER_INFO" ("EMAIL", "PASSWORD","F_NAME", "L_NAME", "ADDRESS", "DATE_CREATED" ,"CONTACT_NUM")
                             VALUES ('${reg_data.Email}','${hash}','${reg_data.Fname}', '${reg_data.Lname}', '${reg_data.Address}', 'NOW()','${reg_data.Contact}')`            
                            )
            res.status(201).json("Created")
        }
     
    }catch(err){
        console.log(err.message)
    }

})
app.post("/addtocart", async(req,res)=>{
    try{
        const cart = req.body
        const product = await pool.query (`INSERT INTO "USER_CART" ("PRODUCT_ID","USER_ID","QUANTITY")
        VALUES ('${cart.PRODUCT_ID}','${cart.USER_ID}','${cart.QUANTITY}','NOW()')`)
    }
    catch(erre){
        console.log(erre)
    }

})

app.listen(PORT,()=>{
    console.log(`Listening on ${PORT}`)
})


