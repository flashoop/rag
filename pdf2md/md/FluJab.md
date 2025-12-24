# FluJab

*Converted from: FluJab.pdf*

---

# FluJab
## **24 [th] May 2019 / Document No D19.100.23**

**Prepared By: MinatoTW**


**Machine Author: 3mrgnc3**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 30


## **SYNOPSIS**

FluJab is a hard difficulty Linux box with lot of components and needs a fair amount of

enumeration. After gaining a list of vhosts from the certificate one is found to be useful. Cookie

tampering allows an unauthorized user to gain access to SMTP configuration which can be

changed in order to receive mails. A parameter is found to be Union SQL injectable result of

which can be seen in the Emails. Another vhost and a set of credentials is gained from the

database which leads to Ajenti management console. The console is found to be misconfigured

allowing overwriting and reading files, from which SSH access can be gained. Privileges can be

escalated through a screens suid which is found to be vulnerable.


## **Skills Required**


  - Enumeration


  - Scripting


## **Skills Learned**


  - Cookie Tampering


  - Union SQL injection


  - Openssl PRNG exploit



Page 2 / 30


## **ENUMERATION** **NMAP**









Page 3 / 30


Page 4 / 30


We see SSH open along with nginx on port 80 which redirects to HTTPS. There are two HTTPS

ports 443 and 8080. Nmap found some vhosts for us which are clownware.htb,

sni147831.clownware.htb, *.clownware.htb, proxy.clownware.htb, console.flujab.htb, sys.flujab.htb,

smtp.flujab.htb, vaccine4flu.htb, bestmedsupply.htb, custoomercare.megabank.htb,

flowerzrus.htb, chocolateriver.htb, meetspinz.htb, rubberlove.htb, freeflujab.htb, flujab.htb.


Add these to the hosts file.

## **HTTP AND HTTPS**


Going to port 80 immediately redirects us to HTTPS. Directly accessing HTTPS through the IP

threw an error as it wasn’t allowed. The server seems to be protected by some kind of WAF.


Lets enumerate the list of vhosts we obtained earlier.


Most of the vhosts are either videos, gifs or given the not allowed error except for smtp.flujab.htb

and freeflujab.htb.


Looking at smtp.flujab.htb we notice a login panel and in the HTML source we find a comment

saying that functionality is deprecated.


So this might be something to look for in the other vhosts.


Page 5 / 30


On freeflujab.htb we come across a page with many options and information.


The patients tab consists of four other options.


We find some forms on navigating to Register and Booking but clicking on Cancelation or

Booking throws a NOT_REGISTERED error. We also know about the /?login feature from earlier.

Trying to view that page redirects us to logout.


Page 6 / 30


Let's investigate this using Burp.


Navigating to /?login we see that the pages responds with a cookie in it’s header with the name

Modus for the path /?smtp_config. The value is base64 encoded, decoding which results in

Configure=NULL.


Let’s change it to Configure=True and send the request to /?smtp_config with the cookie Modus.


Encode And forward the request.


Page 7 / 30


If successful we’ll be able to see the configuration page.


Add the following rule in burp so that it sets the right cookie for us because the server resets it

each time.


Now lets add our IP to the SMTP configuration. Directly adding it on the webpage is restricted by

JavaScript but we can change it from Burp.


Page 8 / 30


Checking the /?whitelist path as instructed by the page we can see that our IP is now listed.


After this is done we need to find a way to receive the mails. First we need to create an SMTP

server. Here’s a simple python code to create an SMTP server.


Page 9 / 30


Now we need to find a page using which we can send ourselves a mail.


Trying to register from /?register we receive this message.



Page 10 / 30


If we try to book an appointment from /?book we receive this message.


Looking at the cookies again we see that there’s a “Registered” cookie with the value

8ce2ed7053c85a035107d6d47f75f1d4=Null which is the Patient cookie. Lets change this to true

and try going to the /?remind page which throws the NOT_REGISTERED error.


Encode it and forward the request. Add a similar match and replace rule to burp like we did

earlier.


Page 11 / 30


After which the /?remind page should be accessible.


Let’s try to send a reminder.


It needs an email address, lets add an email parameter via Burp.


Send the request and make sure the SMTP server is running.



Page 12 / 30


And on the other side we received the mail.


Lets try injecting the nhsnum parameter now to see if it’s exploitable. Lets try a simple payload

like ' or 1=1 which evaluates to true.


Urlencode and send the request.


Page 13 / 30


We receive a mail and this time the Ref: field is populated with the nhsnum unlike earlier which is

the first cell in the table.


Lets try a false payload like ' or 1=2 to see how it responds.


The value in the Ref: field vanished again confirming that it’s injectable.


This behaviour can be scripted for easier exploitation.


Page 14 / 30


Page 15 / 30


The script runs the SMTP server as a thread in the background while we send SQL queries. The

regex Ref: is extracted and the result is printed.


Running the script,

## **SQL INJECTION**


Now let's try to figure out the number of columns in the table using the union select clause.











We see that the server doesn’t respond for three and four columns but replies with 3 at 5

columns which means that the table has 5 columns and the third one is injectable as seen from

the output of version().


Now let’s check the tables in our database.


Page 16 / 30


​ ​



​ ​



​ ​



​ ​



​ ​



​ ​



[The database name is vaccinations, using the Information_schema​](https://dev.mysql.com/doc/refman/8.0/en/tables-table.html) database we can view all the ​

table names in the DB. But we see just one table returned named admin this is because the

query selected just one cell. We can use the concat() operation to view more tables.



​ ​



​ ​



​ ​


We see a few tables, lets see the columns in the admin table.



​ ​



​ ​



​ ​



​ ​


Let’s view the data in these columns. We’ll have to use the concat_ws function in order to avoid

NULL values.



​ ​



​ ​



​ ​



​ ​


Page 17 / 30


Here’s the output,



We obtained a username sysadmin, another vhost sysadmin-console-01.flujab.htb and a SHA256

hash which can be cracked using John.





The hash is cracked as th3doct0r. Lets try logging into the newly found vhost using this.

## **AJENTI CONSOLE**


Trying to navigate to https://sysadmin-console-01.flujab.htb throws an error but there was another

HTTPS service on port 8080. Let's check on https://sysadmin-console-01.flujab.htb:8080.


And we see the login page for Ajenti console. Let's use sysadm:th3doct0r to login now.


Page 18 / 30


After logging in among other options we see a notepad tool.


Clicking on “Open” opens up a File browser at /.


We could potentially abuse this to view the files on the system. For example, the passwd file can

be view by browsing to,





Going into the /home folder we see a lot of users and their home directories.



Page 19 / 30


We can browse into each one to find readable files. Navigating to /home/drno we find a .ssh

folder which isn’t in any other of the user folders.


There’s another file named user_key which is an encrypted SSH key. Let's copy it and try to crack

it using john.


Page 20 / 30


And the hash is cracked as shadowtroll.


Now we can SSH in using this key and password.


However it disconnects right away. So there’s some kind of blocking going on. Lets see the

/etc/ssh folder for configuration changes.


We notice a deprecated_keys folder which is unusual. Let’s dig into it.


Page 21 / 30


​


​ ​



We find some public keys and a README. Let’s view what it’s saying.


It’s talking about compromised keys and deletion of bad private keys. Looks like something

related to key generation. After a bit of googling we come across this repo 
[https://github.com/g0tmi1k/debian-ssh,​](https://github.com/g0tmi1k/debian-ssh) describing a vulnerability in OpenSSL where the PRNG is

predictable. To find a private key we need the public key which could be in the authorized_keys

file.


Looking at the authorized_keys file we noticed this comment,


We see the comment about shell whitelisting, a bit of google about it and we find this [question​](https://askubuntu.com/questions/790415/can-i-create-an-internet-whitelist-using-only-the-packages-availible-on-a-clean) .​

According to the answer, we can use /etc/hosts.deny to deny and /etc/hosts.allow to allow hosts.

## **FINDING THE PRIVATE KEY**


Keeping that aside, first let’s find the private key. To find the key size use ssh-keygen on the

public key file.


Page 22 / 30



​


​ ​



​


​ ​


​ ​



​ ​



​ ​



​ ​



We see that the size is 4096 bits.


[Looking at the repo we notice an archive for 4096 bit keys in this folder​](https://github.com/g0tmi1k/debian-ssh/tree/master/uncommon_keys) .​



​ ​



​ ​



​ ​


Now we can grep for the key to find its corresponding private key.


Once everything is extracted run,



​ ​



​ ​



​ ​


The -R flag is used to search recursively in the extracted folder.


We find a public key named dead0b5b829ea2e3d22f47a7cbde17a6-23269.pub which has a

corresponding private key dead0b5b829ea2e3d22f47a7cbde17a6-23269. Copy it over.



​ ​



​ ​



​ ​



​ ​


Page 23 / 30


However the ssh still fails.


From our enumeration earlier we know about the hosts.deny and hosts.allow files. Let's look at

them.


Page 24 / 30


## **FOOTHOLD**

Looking at the hosts.deny file we see that there’s a deny on any host for sshd.


Let’s fix this by adding ourselves in /etc/hosts.allow.


Enter the IP address and save the file. After trying now SSH we get in!



Page 25 / 30


We land in a rbash shell which can escaped using SSH too. The -t flag is used to force TTY

allocation.





And now it works.



Page 26 / 30


## **PRIVILEGE ESCALATION** **ENUMERATION**

Let’s check the SUID files on the box.


find / -perm -4000 >/dev/null


We see an error that the command wasn’t found. This is because we didn’t fix the path after

breaking out of rbash which is still set to /usr/rbin. Set the path and try again.





We see that /usr/local/share/screen/screen is an SUID file.



Page 27 / 30


​ ​



Checking the version we see that it’s 4.05.00.


A google search yields a privesc [vulnerability​](https://www.exploit-db.com/exploits/41154) ​ in screen. As there’s no gcc on the box let’s

download it locally and compile and replicate the exploit.

## **SCREEN EXPLOIT**


A flaw in an any SUID can be abused to gain code execution as root. The screen binary is an

SUID because it needs to support multiple users at the same time, so it elevates to root and then

switches to the respective user.


Looking at the exploit it first creates a malicious shared object, which acts as a dynamic library on

Linux. Copy the code between the EOF marks into a C file which looks like,



​ ​



​ ​



​ ​



​ ​



​ ​



​ ​



​ ​



​ ​



​ ​



​ ​


And now to compile it.



​ ​



​ ​



​ ​


Page 28 / 30


Next, create another file with these contents which will be our suid shell. This will let us elevate to

root.





And now compile it.





Now let’s download this onto the target. Start a simple HTTP server.







Once done, copy the commands from the end of the exploit one by one in the same order and

execute them.











The last command executes our suid i.e rootshell.


However when running the third command we encounter an error,



Page 29 / 30


This is because it’s picking up the wrong version of screen. Change the binary to

/usr/local/share/screen/screen which we found earlier and repeat.


Trying it again after updating the path works and we get a root shell.



Page 30 / 30


