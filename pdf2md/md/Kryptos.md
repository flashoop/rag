# Kryptos

*Converted from: Kryptos.pdf*

---

# KryptOS
## **27 [th] May 2019 / Document No D19.100.33**

**Prepared By: MinatoTW**

**Machine Author: no0ne & Adamm**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 32


## **SYNOPSIS**

KryptOS is an insane difficulty Linux box which requires knowledge of how cryptographic

algorithms work. A login page is found to be vulnerable to PDO injection, and can be hijacked to

gain access to the encrypting page. The page uses RC4 to encrypt files, which can be subjected

to a known plaintext attack. This can be used to abuse a SQL injection in an internal web

application to dump code into a file, and execute it to gain a shell. A Vimcrypt file is found, which

uses a broken algorithm and can be decrypted. A vulnerable python app running on the local

host is found using a weak RNG (Random Number Generator) which can be brute forced to gain

RCE via the eval function.


## **Skills Required**


  - Enumeration

  - Scripting

  - Cryptography


## **Skills Learned**


  - PDO Injection

  - Exploiting RC4 flaws

  - RCE via SQLite3

  - Decrypting Vimcrypt files

  - Analysing RNG

  - Python eval injection



Page 2 / 32


## **ENUMERATION** **NMAP**





We have just SSH and Apache running on their common ports.



Page 3 / 32


## **HTTP** GOBUSTER

Running gobuster on port 80 with the medium dirbuster wordlist.





It finds a dev directory, which we are forbidden to access.



Page 4 / 32


After browsing to the root folder we find a login page.


Looking at the HTML source we see that the page sends “db” and “token” values along with the

username and password, which is uncommon.


Let’s send this to Burp and try to inspect it’s behaviour.


Page 5 / 32


​



Trying to inject a quote we see that the page returns an error, which is due to improper exception

handling by the application.


According to the [documentation​](https://www.php.net/manual/en/book.pdo.php) PDO stands for PHP Database Object which is an interface for

facilitating database connections and operations. So, we know that this value is being used as a

[parameter for the SQL connection. Looking at the connections ​documentation we see how a](https://www.php.net/manual/en/pdo.connections.php)

connection object is made:


So the value of the dbname must be cryptor and the username and password in their fields. After

a bit more googling we find that exception code 1044 stands for access denied. This must be due

to the extra quote in the dbname. Let’s try injecting a host and supply our IP address.



​



​



​



​



​


and set this as the db value:



​



​



​


Page 6 / 32


Forward the request and we get a connect back on our listener.


But due to protocol mismatch we don’t get any information. We can now steal the mysql hash

using the metasploit module auxiliary/server/capture/mysql. Let’s do that.





Now send the request again.


And we get the hash for the user dbuser. Let’s crack it now.





The hash is cracked as krypt0n1te. Let’s create a user with these credentials on a local mysql

installation.


Page 7 / 32


This creates the user and database giving him access on it.
Next in the mysql configuration file at /etc/mysql/mysql.conf.d/mysqld.cnf comment the line with

the bind address in it.


We don’t know about the table and columns being requested, but can view this in Wireshark.

Start a Wireshark instance and request the page again. Looking at the requests we see the

MySQL protocol.


Right click on it and follow > TCP stream.


We see that the server is requesting the table “users” and the columns “username” and

“password” where the password is an MD5 hash for the string “admin”. Let’s create this table and

insert these values.





Page 8 / 32


Now enter the credentials admin / admin and send the request again from a new page because
the token changes at every attempt.


Forwarding the request we should be logged in and see the page encrypt.php.


The page encrypts files on remote URLs. It offers two kinds of encryption, AES and RC4. Going to

the decrypt page we see that it’s unavailable.


Page 9 / 32


We can’t decrypt AES without the knowledge of the key, IV, etc. but there’s a known plaintext

attack which can be performed against weakly implemented RC4. As long as we have the

plaintext requested by us and the cipher text for any two files, we can use them to decrypt the

message.


RC4 is a stream cipher which uses a keystream in order to encrypt a message, example:


1. Let the keystream be K and the message be M1.

2. In order to encrypt M1 we just xor it with the keystream K,

C1 = M1 ^ K, where C1 is the ciphertext for M1.

3.  Now suppose if we have another Message M2 and it’s corresponding ciphertext C2.

C2 = M2 ^ K, where C2 is the ciphertext for M2.

4.  Now, let’s xor both the ciphertexts,

C1 ^ C2 = M1 ^ K ^ M2 ^ K which reduces to,

C1 ^ C2 = M1 ^ M2

5. Suppose we have the plaintext M1 and ciphertexts C1 and C2, we can recover the

message M1,   M1 ^ M2 ^ M2 = C1 ^ C2 ^ M2 which reduces to,

M1 = C1 ^ C2 ^ M2

6. Hence, if we xor the plaintext against the Ciphertexts we can recover the plaintext

message.


Page 10 / 32


## **RECOVERING PLAINTEXT**

Let’s try implementing the above idea. First create a file with a lot of characters. Then start simple

HTTP server.





Now request the file.txt on the encryption page.


The page should respond with the encrypted text.


Copy and paste this into a file named “ciphertext1”. Next let’s request a page which is on the

server through localhost address like the index.php page.


Then copy the encrypted text in the response to the file ciphertext2 and use the python script to

decrypt.


Page 11 / 32


And we see that we were able to access the page via localhost. This is a kind of SSRF ( Server

Side Request Forgery) where an attacker can access the local resources.


From our earlier information we found a folder at /dev. Let’s request the page to see it’s code.


The page responds with some encrypted text again. Copy and paste it into a file named

“ciphertext2”. Now we can script the decryption like this:







Page 12 / 32


Let’s run it to see the contents of /dev/index.php.


It has two views “about” and “todo”. Let’s check them. Repeat the same process and replace

ciphertext2 with the new page.


Running the script again on the new file.


Page 13 / 32


It just says that “This is about page”. Let’s view the todo page now.


In the todo list we see that sqlite_test_page.php is to be removed and the world writable folder

used for it. In the “Done” list we see that /dev was restricted and PHP disabled_functions was

enabled, which prevents executing code directly. Let’s view the sqlite_test_page.php now.


Page 14 / 32


Copy the encrypted text and decrypt it using the script.


We don’t see anything, this is because the PHP code was executed. To view the code we can

leverage the PHP base64 wrapper through the index.php page. For example:





Let’s test this out.


This time we receive the page with base64 encoded content. Let’s copy it to a file and decode it.


Page 15 / 32


Page 16 / 32


The page takes a “bookid” parameter and then uses it to get a list of books from the sqlite

database. The database “books.db” is located in a world writable folder. If “no_results” is set the

query is executed.


There’s no sanitization mechanism in the script, so the application is vulnerable to SQL injection.

Using sqlite3 we can write files to the folder. For example, create a sqlite3 database locally:





After this press Ctrl + D to exit and view the files. A file named abc,txt should be created locally
with the contents “HTB ROCKZZ!’.


Let’s try this on the box. The URL would look like this:





As there are multiple parameters we’ll have to encode the payload. Use burp to intercept the
request. First request the URL:


Page 17 / 32


Then intercept the request in Burp and append this payload to the URL.





After appending select the payload only and right click > URL encode > encode all characters,

repeat this two times. After which the URL would look like this.


Page 18 / 32


​



​



Forward the request now. To check if the file got created request this link for encryption.:


​



​



​



​



The page responds with a lot of text. Copy it to ciphertext2 and decrypt it with the script.


We see our text “HTB ROCKZZ!” among the other SQL queries. Now that we can write files, we

can try writing PHP code and get it executed. But as we already know, dangerous functions are

[disabled. This can be bypassed using ​chankro.​](https://github.com/TarlogicSecurity/Chankro) It abuses the PHP mail() function which uses the


Page 19 / 32



​


sendmail binary in order to achieve RCE. Follow these steps to set it up:





Now we need a reverse shell payload which would send us a shell. We can use a bash reverse

shell to send us a shell. Create a bash script with the contents:





Now use chankro to create the payload script.





The path flag holds the value to the path on the remote server where the shell is located. Now
we need to create a payload which delivers our shell. This has to be simple as there are a lot of
bad characters.

The payload could be something like this:





It gets the contents of the file pwn.php from our server and then puts it into the file pwn.php in

the secret folder. Repeat the same process as earlier to deliver it.


Page 20 / 32


Double URL encode the payload and send the request. Once done, to trigger the payload
request the page:





Make sure pwn.php is hosted on the local web server. After making the request we should get a
hit on pwn.php.


Now to execute the reverse shell, start a listener and request the URL:





If it’s successful we should receive a shell on our end.



Page 21 / 32


Get a tty using python:





Page 22 / 32


## **LATERAL MOVEMENT**

Looking into the user’s home folder we find two readable files creds.old and creds.txt.


The file creds.old consists of some credentials and the file creds.txt is a “Vim encrypted file”.


Use base64 on the creds.txt file and copy it locally and decode it.





Looking at the file header we see that it’s a Vimcrypt02 file.


VimCrypt02 uses Blowfish in Cipher Feedback mode in order to encrypt the file.



Page 23 / 32


The problem is that due to a bug, the first 8 blocks all have the same IV - which is 64 bytes of

information. Looking at the file it is 42 bytes in size excluding the header. From the creds.old file

we already have first 8 bytes of the plaintext which is “rijndael”. Using this we can xor against the

first 8 bytes of the encrypted file and recover the key, and use it to decrypt the rest. First, remove

the VimCrypt header from the file using dd.





Then we can get the password using this simple script.









The script first read the content from encrypted.txt. Then it xors the first 8 bytes against “rijndael”.

Then the key is repeated 5 times to match the total size of the encrypted content and then xor’ed

against the file to recover the password. Running the script:


Now we have the password for the user rijndael, and can login via SSH.


Page 24 / 32


## **PRIVILEGE ESCALATION**

We login via SSH and enumerate the home folder. There’s a folder named kryptos in the home

folder.


It contains a script named kryptos.py. Looking at the running processes we see that a script with

the same named is running as root.


Let’s see what the contents of the script are.









Page 25 / 32


Page 26 / 32


The script is a python bottle application running on port 81. It has three routes /, /eval and

/debug. The /eval takes input in the form of a JSON through a POST request. It extracts the

expression and the signature from the JSON. Then it verifies whether the signature of the

expression matches the signature supplied by the user. If true, it uses eval to evaluate the

expression. Looking at the key generation mechanism we see that it uses a random number

generated by the secure_rng() function. If the number of the values generated by the rng isn’t

truly random we’ll be able to brute force it.


Page 27 / 32


Let’s check how random the secure_rng function really is. Create a script with the following code:









Lets run it in a loop and output all the values into a file.





This generates 11000 values using the function and puts them into a file. It takes a little while to

finish. After it’s done, check the unique values in the file:


We see that out of 11000 values only 209 of them are unique. Not really random, is it? This will let


Page 28 / 32


us brute force the signature for any kind of payload. Let’s try that. First copy all the 209 values

into a file:





Now forward port 81 from the box to our host.





Verify that it’s working:





Then we create a script to brute force the signatures along the lines of the server script.





Page 29 / 32


The reads the random values one by one from the file and then creates a signing key using each

one. Then it signs the expression which is “1337 + 1337” with the signingKey. Then it creates a

JSON and sends a POST request. If the response doesn’t have “Bad signature” in it, the script

prints the response and exits. Run the script for a while:


The script finds the right signature and the server responds with the sum of our supplied

expression. Now that we know that it’s vulnerable, we need to find a way to execute code

through that eval function. As all the builtins are omitted we can’t directly use the system()

function to execute code. But we can use objects like lists, tuples and their metaclasses. For

example:





Using this we can iterate through all the subclasses using __getitem__. We find that the os


Page 30 / 32


module is present at 117.


We call the __init__ method and then list all the globals in the os class.


From here we can use any function in the os module, like system or popen. For example:





Now we’re able to execute code without the help of any builtins. Let’s test this on the page. Edit

the script and the code we just created. FIrst, generate a base64 one liner to execute a bash

reverse shell. This will help us avoid bad characters.





Now copy the resulting value and put it into the script.





Page 31 / 32


This executes a bash reverse shell using the system function.

Run the script again and start a listener.


And when the right signature is hit, we’ll receive our root shell.



Page 32 / 32


