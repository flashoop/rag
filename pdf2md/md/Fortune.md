# Fortune

*Converted from: Fortune.pdf*

---

# Fortune
## **21 [th] May 2019 / Document No D19.100.29**

**Prepared By: MinatoTW**

**Machine Author: AuxSarge**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 18


## **SYNOPSIS**

Fortune is an insane difficulty OpenBSD box which hosts a web app vulnerable to RCE. Using the

RCE the CA key can be read, which is used to create HTTPS client certificates. The client

certificate leads to an SSH login, which helps to bypass the firewall. This allows mounting of an

NFS share and dropping a suid to be executed as the user. An application is found to be using

faulty encryption logic, which allows for escalation of privileges to root.


## **Skills Required**


  - Enumeration

  - Code review


## **Skills Learned**


  - Creating HTTPS client certificates

  - NFS exploitation


Page 2 / 18


## **ENUMERATION** **NMAP**





We find three open services i.e SSH, HTTP and HTTPS.

## **HTTPS**


Browsing to the HTTPS page, the browser asks for a client certificate which we don’t possess,

and so the connection fails.


Page 3 / 18


​ ​


## **HTTP**

Navigating to port 80 we see a simple page with some options.


Selecting one and submitting displays the fortune from that DB. Let’s inspect this in Burp.


We see that it just sends our selected DB using a POST parameter. Lets try injecting commands

using ;​ . ​


Page 4 / 18



​ ​



​ ​


​ ​


## **COMMAND INJECTION**

We try something simple like db; id​ and see if it responds. ​


After url-encoding and sending it, we see that it worked and we were able to inject commands.

Trying a reverse shell fails due to outbound firewall restrictions. So we need to enumerate via this

command injection. Lets script this for faster enumeration.



​ ​



​ ​



​ ​



​ ​



​ ​



​ ​


It justs sends a command and grabs the output between the pwn markers for easier selection.


Page 5 / 18



​ ​


Now let’s enumerate the file system to find the CA certificate and other such information. Looking

at the home folder we find three users.


The home directory of bob seems to contain some keys.


To create the client certificate we’ll need the private key and the CA certificate. An intermediate

certificate is a subordinate certificate issued by the trusted root CA specifically to issue end-entity

server certificates. So we’ll grab the intermediate key and cert at

/home/bob/ca/intermediate/private/intermediate.key.pem and

/home/bob/ca/intermediate/certs/intermediate.cert.pem respectively.


Use the script to cat those files and copy them locally.





Page 6 / 18


## **CREATING CLIENT CERTIFICATE**

Now that we have a private key and a CA issued certificate, let’s create a client certificate. Follow

these steps to create one.





We basically create a CSR (Certificate signing request) and get it signed by the CA and then

create a client certificate.


Now we need to import this certificate to our browser. In firefox go to Preferences > Privacy &

Security > View Certificates. Then in the Your Certificates section click on Import, and import the

cert.


Now when we browse to the HTTPS page we should be able to select the right certificate and

move further.


The page asks us to generate a key pair to access the authpf service. Let’s do that. Clicking on

generate should take us to /generate and we get a key.


Page 7 / 18


​ ​



​ ​



Copy the key locally to SSH in. Looking at the passwd file we see that the nfsuser has the shell

set as authpf.


[So the key could belong to him. According to FreeBSD documentation​](https://www.freebsd.org/cgi/man.cgi?query=authpf&apropos=0&sektion=8&manpath=FreeBSD+8.1-RELEASE+and+Ports&format=html), ​


Authpdf is used for authenticating gateways which alters the pf (packet filter) rules when a user

authenticates. In short it allows us to bypass the firewall. Let’s scan the ports again to see what

opened. First ssh in as nfsuser.



​ ​



​ ​



​ ​



​ ​



​ ​


Page 8 / 18


## **NFS EXPLOITATION**

Let’s nmap the box again to see what opened.





We see that NFS and RPC have opened along with port 8081. Navigating to port 8081 we see this

message.


Let’s keep this aside and enumerate NFS first. We can view the exported shares using

showmount.





Page 9 / 18


We see that /home is accessible to everyone. Lets mount it to view the contents.





We try to go into Charlie’s home folder but get permission denied. This is can be circumvented by

accessing the share with a uid equal to Charlie’s uid.


Page 10 / 18


## **FOOTHOLD**

Going back to the RCE we see that Charlie’s uid is 1000.


So we add a user with uid 1000 and switch to him.





And now we’re able to get into the folder and read the flag. To get a shell let’s copy our public

key to the authorized_keys file.





Page 11 / 18


And now we should be able to ssh in as charlie.





Page 12 / 18


## **PRIVILEGE ESCALATION** **ENUMERATION**

Straight away we notice a mbox (mailbox) file in Charlie’s home. Let’s look into it.


We see that the dba password for pgadmin is same as root. Let’s find the files for this application.


Going into /usr/local/pgadmin4 we find the source code for the application in the web folder.


Page 13 / 18


Looking at pgAdmin4.py we see that it imports files from the pgadmin folder and the config file.


The config file gives us some information like the data directory, the hash being used and the

database which stores the user account settings.


Let’s get this file to view its contents.





We can view it using sqlitebrowser.





We see a server table and user table. Right click and select Browse table.



Page 14 / 18


Looking at the table we see the password hashes for Charlie and Bob.


Going back to the server table we find the base64 encoded string which could be the encrypted

password for dba and the root password.


Let’s check the encryption logic to find flaws. Going into pgadmin/utils we find a file named

crypto.py. The file seems to contain a function decrypt.


It takes in the ciphertext and key, creates IV from first 16 bytes which is the block size and

decrypts the rest.


Page 15 / 18


Let’s find where it is implemented.





We see that connection.py and server_manager.py uses it. Let’s inspect them.

The connect() function in connection.py seems to use the decrypt function.


The encpass is the encrypted root password and the user.password is the password “hash” from

the user table and not the plaintext password. Since we already have the hash and the encpass

we can use the decrypt function to decrypt it. We know from the email that Bob is the user who’s

using the application. So we create a script to decrypt the dba password. We can copy the pad

and decrypt functions from the crypto.py script.









Page 16 / 18


Page 17 / 18


Running the script should give us the dba password.


Using this password we can now su to root.


And we have a root shell.



Page 18 / 18


