# Chaos

*Converted from: Chaos.pdf*

---

# Chaos
## **25 [th] April 2019 / Document No D19.100.18**

**Prepared By: MinatoTW**

**Machine Author: felamos**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 19


## **SYNOPSIS**

Chaos is a “medium” difficulty box which provides an array of challenges to deal with. It requires

a fair amount enumeration of the web server as well as enumerating vhosts which leads to a

wordpress site which provides a file containing credentials for an IMAP server. The drafts folder

contained sensitive information which needed cryptographical knowledge to decipher. The

decrypted information leads to a page hosting a vulnerable Latex application which helps to gain

a foothold. Password reuse helps to land a shell as a user but in a restricted shell which can be

bypassed by abusing a GTFObin. Escaping the shell gives access to the user’s firefox folder

containing saved logins which on decrypting gives access to a webadmin console and the root

shell.


## **Skills Required**


  - Web server enumeration

  - Wordpress enumeration


## **Skills Learned**


  - Breaking out of restricted shells

  - Extracting data from firefox profiles


Page 2 / 19


## **ENUMERATION** **NMAP**





It’s running Apache on port 80, two instances of both IMAP and POP3 servers and webmin
console on port 10000.


Page 3 / 19


## **APACHE - PORT 80**

On accessing Apache the server returns a message saying “Direct IP not allowed”.


So, probably it’s expecting to use a vhost to access the server. However the message isn’t a

standard apache page.


Using chaos.htb as the vhost to access the server.





Now the website greets us with a static website with html pages.



Page 4 / 19


​ ​


## GOBUSTER

Running gobuster using directory-list-2.3-medium.txt on both the vhost and IP address.


​ ​



​ ​



​ ​



​ ​



[It discovers a /wp folder on http://10.10.10.120​](http://10.10.10.120/) browsing to which shows a wordpress website. ​


Page 5 / 19



​ ​


​ ​



It hosts some kind of password protect page. Lets enumerate it with wpscan before going further.

## WORDPRESS


​ ​



​ ​



​ ​



This will enumerate all the plugins as well as users on the website. The scan did find some
vulnerabilities but they need authentication. However, on enumerating users the scanner found a
username human.


On trying the username as the password for the protected page access is granted.


We obtain webmail credentials i.e ayush:jiujitsu​ . ​


Page 6 / 19



​ ​



​ ​


​ ​


## **IMAP SERVER**

As SSL is enabled we’ll need to connect with openssl.


​ ​



​ ​



​ ​



[Command reference for IMAP can be found here https://wiki.dovecot.org/TestInstallation​](https://wiki.dovecot.org/TestInstallation) . ​



​ ​



​ ​



​ ​



​ ​


The default Inbox folder didn’t have any received mails. Although there were Drafts and Sent
folders. Selecting the drafts folder listed an existing mail.


Page 7 / 19


Fetching the mail revealed a message and two attachments encoded in base64.

## DECRYPTING THE MESSAGE

The draft had enim_msg.txt which contained the encrypted message and en.py which was used
to encrypt the message. Decoding the base64 blobs gave an encrypted file and a python script.









Page 8 / 19


The getKey() function from the script returns the password hashed in SHA256. From the mail we
know that the password is “sahay”. The encrypt() functions takes in the key and the message file
to encrypt. The chunksize is set to 64*1024 bits which is equal to 16 bytes, the standard block
size of AES. Next it finds the size of the file and then uses zfill(16) in order to make it a block. The
function zfill() fills a value from the left with zeros until it’s equal to the passed argument. It then
initializes a random IV of 16 bytes. IV stands for Initialization vector which is used to add
randomness to the encrypted message. Then an AES object is created in CBC mode using the
key and IV.





Once done it opens up the message and the output file. It proceeds to write the filesize and IV to
the encrypted file which is good for us because without the IV it would be impossible to decrypt
the message.





Then it enters into a loop and starts reading the file contents chunk by chunk. It stops if the chunk
size is 0. If the chunk size is less than 16, it is padded with spaces so create a block. Each chunk
is then encrypted and written to the file.





Page 9 / 19


To decrypt the contents a similar script is needed which reads the IV from the file and then uses it
to decrypt the chunks. First import the required packages. Define a function decrypt which takes
in the key and encrypted filename. We use the same chunksize as earlier. Open the file and read
16 bytes of filesize which isn’t significant and then the IV from the next 16 bytes.





Page 10 / 19


Next create the AES object and open the output file. Start reading chunks and break if the size is
equal to 0. Then decrypt the chunks and write to the outfile. We use the same getKey() function
as the script and then call the decrypt() method with the key and encrypted file.

The resulting file consists of base64 encoded content which on decoding gives the message.





The invalid input error is due to the padding added by the script. From the message we retrieve a
directory on the web server.


Page 11 / 19


## **FOOTHOLD** **EXPLOITING LATEX**

The page was a pdf maker which says that it’s on hold. The functionality wasn’t really working.


From the javascript it’s noticed that it uses Ajax requests.


Page 12 / 19


​ ​

​ ​ ​



Using Burp we can intercept the requests and examine them.


The server returned some logs which were from PdfTex which is used to create PDF files from
.tex source and from the LaTex family. Some packages from these are vulnerable to code
execution. It is well described here [https://0day.work/hacking-with-latex/​](https://0day.work/hacking-with-latex/) . ​

To execute a command the syntax is \input|​ command​ . However on using it we notice that it’s ​
blacklisted.


Page 13 / 19



​ ​

​ ​ ​



​ ​

​ ​ ​


​ ​ ​ ​



But according to the page we can bypass it using \immediate\write18{​ command​ ​} which works ​
as intended.


Now, a netcat reverse shell can be used to get a shell on the box.



​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​


Page 14 / 19



​ ​ ​ ​


## **LATERAL MOVEMENT** **BREAKING OUT OF RESTRICTED SHELL**

After getting a shell as www-data get a tty using python. Due to password re-use we can su to

ayush with the password “jiujitsu”.





However, due to restricted shell we can’t move to different folders from within the shell.


On checking the PATH variable it appears to be “/home/ayush/.app” . So, if we can list it’s
contents we could leverage a binary allowed to be used.


We find ‘ls’ to be restricted however another directory listing command ‘dir’ works.


Page 15 / 19


​ ​



We have tar and ping available out of which tar is a GTFObin.

## USING TAR TO BREAK OUT


[According to https://gtfobins.github.io/gtfobins/tar/​](https://gtfobins.github.io/gtfobins/tar/) we can abuse tar checkpoints to execute ​

arbitrary commands.



​ ​



​ ​



​ ​


Issuing this command executes /bin/sh breaking us out of the shell. However, the PATH should

be fixed as it wasn’t set to its original value.


Get a tty using python or python3.


Page 16 / 19



​ ​



​ ​


​ ​ ​ ​


## **PRIVILEGE ESCALATION** **INSPECTING MOZILLA FIREFOX PROFILE**

The user’s folder consists of a .mozilla folder which has a firefox profile in it.


This can be used to gain saved credentials if any, using tools like [firefox_decrypt​](https://github.com/unode/firefox_decrypt) or​ [firepwd​](https://github.com/lclevy/firepwd) . ​


First transfer the folder to local box for extraction.



​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​


Page 17 / 19



​ ​ ​ ​


​ ​


​ ​ ​ ​



Now extract the contents and use firefox_decrypt on the profile. We can re-use the password
“jiujitsu” yet again to decrypt the contents.


​ ​


​ ​ ​ ​



​ ​


​ ​ ​ ​



​ ​


​ ​ ​ ​



​ ​


​ ​ ​ ​



We obtain the password for the user root as Thiv8wrej~​ using which we can su to root. ​

## ALTERNATE WAY TO ROOT


In case if the password didn’t let us su to root directly, we can gain a root shell from the webmin

console at port 10000 as the credentials suggested.


[Browse to https://chaos.htb:10000​](https://chaos.htb:10000/) and use ​ root:Thiv8wrej~​ to login. ​


Page 18 / 19



​ ​


​ ​ ​ ​


Once logged in, click on “Others” on the dashboard menu and then select command shell.


And a command shell pops up which can be used to issue commands as root.


Page 19 / 19


