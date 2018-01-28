/**
 * Require the credentials that you entered in the .env file
 */
require('dotenv').config()

const Web3 = require('web3')
const axios = require('axios')
const EthereumTx = require('ethereumjs-tx')
const log = require('ololog').configure({ time: true })
const ansi = require('ansicolor').nice

/**
 * Flag that defines whether to use the testnet or mainnet
 * @type {Boolean}
 */
const testmode = true

/**
 * Network configuration
 */
const mainnet = `https://mainnet.infura.io/${process.env.INFURA_ACCESS_TOKEN}`
const testnet = `https://rinkeby.infura.io/${process.env.INFURA_ACCESS_TOKEN}`


/**
 * Change the provider that is passed to HttpProvider to `mainnet` for live transactions.
 */
const networkToUse = testmode ? testnet : mainnet
const web3 = new Web3( new Web3.providers.HttpProvider(networkToUse) )


/**
 * Set the web3 default account to use as your public wallet address
 */
web3.eth.defaultAccount = process.env.WALLET_ADDRESS


/**
 * The amount of ETH you want to send in this transaction
 * @type {Number}
 */
const amountToSend = 0.00100000


/**
 * Fetch the current transaction gas prices from https://ethgasstation.info/
 * 
 * @return {object} Gas prices at different priorities
 */
const getCurrentGasPrices = async () => {
  let response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json')
  let prices = {
    low: response.data.safeLow / 10,
    medium: response.data.average / 10,
    high: response.data.fast / 10
  }

  console.log("\r\n")
  log (`Current ETH Gas Prices (in GWEI):`.cyan)
  console.log("\r\n")
  log(`Low: ${prices.low} (transaction completes in < 30 minutes)`.green)
  log(`Standard: ${prices.medium} (transaction completes in < 5 minutes)`.yellow)
  log(`Fast: ${prices.high} (transaction completes in < 2 minutes)`.red)
  console.log("\r\n")

  return prices
}


/**
 * This is the process that will run when you execute the program.
 */
const main = async () => {

  /**
   * Fetch the balance of the destination address
   */
  let destinationBalanceWei = web3.eth.getBalance(process.env.DESTINATION_WALLET_ADDRESS).toNumber()
  let destinationBalance = web3.fromWei(destinationBalanceWei, 'ether')

  log(`Destination wallet balance is currently ${destinationBalance} ETH`.green)


  /**
   * Fetch your personal wallet's balance
   */
  let myBalanceWei = web3.eth.getBalance(web3.eth.defaultAccount).toNumber()
  let myBalance = web3.fromWei(myBalanceWei, 'ether')

  log(`Your wallet balance is currently ${myBalance} ETH`.green)


  /**
   * With every new transaction you send using a specific wallet address,
   * you need to increase a nonce which is tied to the sender wallet.
   */
  let nonce = web3.eth.getTransactionCount(web3.eth.defaultAccount)
  log(`The outgoing transaction count for your wallet address is: ${nonce}`.magenta)


  /**
   * Fetch the current transaction gas prices from https://ethgasstation.info/
   */
  let gasPrices = await getCurrentGasPrices()


  /**
   * Build a new transaction object and sign it locally.
   */
  let details = {
    "to": process.env.DESTINATION_WALLET_ADDRESS,
    "value": web3.toHex( web3.toWei(amountToSend, 'ether') ),
    "gas": 21000,
    "gasPrice": gasPrices.low * 1000000000, // converts the gwei price to wei
    "nonce": nonce,
    "chainId": testmode ? 4 : 1 // EIP 155 chainId - mainnet: 1, rinkeby: 4
  }

  const transaction = new EthereumTx(details)


  /**
   * This is where the transaction is authorized on your behalf.
   * The private key is what unlocks your wallet.
   */
  transaction.sign( Buffer.from(process.env.WALLET_PRIVATE_KEY, 'hex') )


  /**
   * Now, we'll compress the transaction info down into a transportable object.
   */
  const serializedTransaction = transaction.serialize()

  /**
   * Note that the Web3 library is able to automatically determine the "from" address based on your private key.
   */

  // const addr = transaction.from.toString('hex')
  // log(`Based on your private key, your wallet address is ${addr}`)

  /**
   * We're ready! Submit the raw transaction details to the provider configured above.
   */
  const transactionId = web3.eth.sendRawTransaction('0x' + serializedTransaction.toString('hex') )

  /**
   * We now know the transaction ID, so let's build the public Etherscan url where
   * the transaction details can be viewed.
   */
  const url = `https://rinkeby.etherscan.io/tx/${transactionId}`
  log(url.cyan)

  log(`Note: please allow for 30 seconds before transaction appears on Etherscan`.magenta)

  process.exit()
}

main()
