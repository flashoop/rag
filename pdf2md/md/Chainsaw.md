# Chainsaw

*Converted from: Chainsaw.pdf*

---

# Chainsaw
## **8 [th] October 2019 / Document No D19.100.43**

**Prepared By: MinatoTW**

**Machine Author: artikrh & absolutezero**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 20


## **SYNOPSIS**

Chainsaw is a Hard Linux machine with various components in place. The server is running an

Ethereum node, which is used to store and retrieve data. This can be modified by an attacker to

set malicious data on the latest block and get code execution. The box contains an installation of

IPFS ( Interplanetary File System ), and further enumeration reveals that it contains an encrypted

SSH key, which can be cracked to gain lateral movement. This user has execute permissions on a

SUID file, which interacts with another node running on localhost. This is exploited in a similar

way as earlier to get a root shell.


## **Skills Required**


  - Python scripting

  - Enumeration


## **Skills Learned**


  - Solidity and Ethereum contracts

  - Using Web3.py API

  - IPFS

  - Slack space and Bmap


Page 2 / 20


## **Enumeration** **Nmap**





Anonymous FTP is available and contains three files. There’s SSH open on port 22 and an
unknown service running on port 9810.


Page 3 / 20


​


​ ​


## **FTP**

The .sol file, a JSON file and a file named address.txt are downloaded and examined. The

contents of WeaponziedPing.sol are:


​


​ ​



​


​ ​



​


​ ​



Searching about solidity online, we come across [this​](https://solidity.readthedocs.io/en/v0.5.11/) post. It seems that solidity is a high level

language used to create smart contracts for the Ethereum blockchain. A contract is a piece of

code along with its data and functions which resides on a blockchain. The setDomain() function

stores the value of the variable store (i.e google.com) onto the blockchain. Then, the function

getDomain() can be used to retrieve the data. Looking at the JSON file, we see that it’s an ABI

[(Application Binary Interface​](https://solidity.readthedocs.io/en/v0.4.24/abi-spec.html) )​ for the contract “WeaponizedPing”. An ABI is a way to encode data

in solidity to work with smart contracts. Ethereum contracts are deployed in the form of byte code

on the chain. An ABI helps to specify which functions to call and what data to access. This helps

in portability as well as ease of access.


Page 4 / 20


​


## **Ethereum Node**

Looking at the JSON file, we see how functions are stored in the form of objects.


​



​



​



The “type” is function, the getDomain function has a return type of “string” and the setDomain

function has an input parameter. The solidity documents [here​](https://solidity.readthedocs.io/en/v0.4.24/abi-spec.html) shows the other types which can

be defined in an ABI.


Page 5 / 20


​ ​


​ ​



​ ​

​ ​


The [web3.py ​](https://web3py.readthedocs.io/en/stable/quickstart.html) p​ ython library can be used to interact with the Ethereum node. Use pip to install it.


From the name of the contract, we can assume that the server uses the value of the domain i.e

“google.com” and attempts to ping it. If we’re able to rewrite the value and inject commands, it

would be placed on the latest block on the blockchain and used by the server.


Let’s try to create a connection, and find the pre-existing account using this library. We need to

use the [HTTProvider​](https://web3py.readthedocs.io/en/stable/providers.html#httpprovider) in order to talk to the server. ​



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


The code above returns the default first account present on the node. We can use this as the

sender for our transaction. We already have the address of the account to make the transaction

to. In order to use the functions we need to import abi. This can be achieved using the json

module.



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


Page 6 / 20


The script reads the recipient address from address.txt, then loads the abi from the JSON file

provided by the server. A contract object is created using the abi and address. This loads all

functions and data and is ready to make transactions. Then, we check the current domain set on

the latest block by calling the getDomain() function. Upto this point we aren’t making any

transactions.


It returns the current domain as google.com which means that our script was successful in

interacting with the node. Now, we need to use the setDomain() call to inject our malicious value

and create a transaction to place it on the block. Let’s try to ping ourselves.





Page 7 / 20


In addition to the previous script, this script injects a ping command to the new domain and uses

the transact() method to set it. It then calls the getDomain() method to check if it was placed on

the latest block. Run the script and start a tcpdump listener to monitor ICMP traffic.


From the script output it’s seen that the domain was successfully set to the malicious command

and we received ICMP traffic on our listener. To get a shell, we can replace the ping command

with a bash reverse shell.


Page 8 / 20


## **Foothold**

Edit the malicious_domain variable in the script.





Start a listener on port 4444 and run the script again.


A shell as the user administrator should be received. Looking at the passwd file we see that only

bobby has a bash shell assigned to him.


Page 9 / 20


​ ​


​


## **Lateral Movement**

Apart from that, we see a .ipfs folder in the user’s home folder. Searching about IPFS takes us to

this [page​](https://ipfs.io/) . It seems that IPFS is a peer to peer sharing protocol based on blockchain, where each​

file is given a cryptographic hash. But since the HTTP server isn’t configured on the box, we’ll

[have to query the local files. Looking at the ​documentation, we see the “ipfs refs local” command​](https://docs.ipfs.io/reference/api/cli/#ipfs-refs-local)

lists local references. After running it on the box, multiple hashes are returned.


To view the file names, the command “ipfs ls” can be used.


The loop above, reads each hash from the output and runs ipfs ls on it. Multiple files are listed

and we see some public keys and eml (email) files. As we know that bobby is a valid user, let’s try

reading his mail. The “ipfs cat” command can be used along with the hash to read the file.


Page 10 / 20



​ ​


​



​ ​


​


We see an email with the subject “Ubuntu Server Private RSA key”, with a base64 encoded

attachment named bobby.key.enc. Copy the encoded text locally and decode it.


After decoding we get an encrypted RSA key as expected. This can be cracked using john and

rockyou.txt. Use ssh2john to create a hash from the key.


Page 11 / 20


The password for the key is found to be “jackychain”. We can now use this to SSH into the server

as bobby.


Page 12 / 20


## **Privilege Escalation**

Looking around in bobby’s home folder we see a projects folder, with a subfolder called

ChainsawClub. The folder contains a SUID file named ChainsawClub along with a .sol file and a

JSON file with the same name.


Looking at the .sol file, we see another contract with various functions.





The contract contains username, an MD5 hash of the password which cannot be cracked.


Page 13 / 20


Let’s run the binary to see what it does.


The binary asks us for credentials and then exits when we supply wrong values. The binary also

creates a file named address.txt, which we assume is the recipient address.


Looking at the contract, we see the functions setUsername() and setPassword(). We could set

these to known values controlled by us, and then enter them as credentials. But we don’t know

the port where it’s interface is running on. Looking at the ports listening locally, we see port


Page 14 / 20


63991 listening on localhost.


Let’s forward this port and try interacting with it.


The command above creates an SSH tunnel from port 63991 on our localhost to port 63991 on

chainsaw. Let’s transfer the JSON file from the server now.


We can now use this to start building our exploit script.


As the hash in the script couldn’t be cracked, we could set our own username and password.

Looking at the solidity contract we see the functions setPassword() and setUsername(). Let’s use


Page 15 / 20


them to change the credentials.





The script connects to the forwarded port on our localhost. The toAddress variable contains the

address from the address.txt file created on the box. Then it creates a contract using the abi. The

setUsername function is then called to set the username to “administrator”. Then the md5

function is used to create an MD5 hash for the string “admin” after which the setPassword

function is called.


Page 16 / 20


Let’s try running the script and then going back to the SUID file.


We can try using these credentials to login.


We receive a “User is not approved” message. Going back to the contract we see another

function named setApprove().





Page 17 / 20


Maybe the program checks if this value is set before logging us in. Let’s set this value using the

function. Add the following lines to the script and run again.





The function takes in a boolean value which is why we pass is the value “True”.


This time we get a different message which means approval was successful. The message says

“Not enough funds”. In the contract, we can see that the totalSupply is set to 1000. There’s

another function named transfer():





Let’s transfer the entire supply to ourselves using the transfer() function. Add the following lines


Page 18 / 20


to the script.





The function checks if the input amount is greater than the totalSupply, which ensures that w

can’t exceed the value of 1000. Run the script and try logging in again.


This time, the server lets us in and we get a root shell. Looking at root.txt we that it isn’t an actual

hash.


Page 19 / 20


[After a bit of research we’ll find that the ​bmap](https://www.computersecuritystudent.com/FORENSICS/HIDING/lesson1/index.html) command on Linux can be used to hide data in the

slack space of memory blocks. Slack space is the empty space in a block of memory which isn’t

completely filled by data. This space can be used to hide data as it can’t be normal accessed.


Checking on the box we see that command bmap is available. The ​ **--mode slack** option can be

used to extract the flag from it.


Page 20 / 20


