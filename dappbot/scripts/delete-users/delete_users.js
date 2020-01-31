const stripe = require('stripe')('stripe api key')
const prompt = require("prompt-async");

//WILL DELETE CUSTOMER DATA ASSOCIATED WITH THIS LIST OF EMAILS
let listOfEmails = ['sample@email.com']

async function deleteUsers(){
  prompt.start()
  let data = []
  let lastObj
  const batchSize = 100
  while(true){
    let listCustomers = await stripe.customers.list({limit:batchSize,starting_after:lastObj})
    data = data.concat(listCustomers.data)
    if(!listCustomers.has_more){
      break
    }
    lastObj = listCustomers.data[listCustomers.data.length - 1].id
  }
  data = data.filter(function (customer) {
    return listOfEmails.includes(customer.email)
  })
  console.log(data)
  console.log("You are about to delete these users are you sure you want to continue?")
  console.log("type Yes/yes/Y/y for yes or anything else for no")
  
  const {confirmBool} = await prompt.get(["confirmBool"])
  if(confirmBool.toLowerCase()=== "yes" || confirmBool.toLowerCase()==="y"){
    if(data.length === 0){
      console.log("No user to be deleted")
      return
    }
    for(var i=0; i<data.length; i++){
      // console.log(data[i].email)
      if(listOfEmails.includes(data[i].email)){
        var result = await stripe.customers.del(data[i].id)
        console.log(`User ${data[i].id} deleted`, result)
      }
    }
  }else{
    return
  }
  
}
deleteUsers()