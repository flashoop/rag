# Luke

*Converted from: Luke.pdf*

---

# Luke
## **26 [th] May 2019 / Document No D19.100.40**

**Prepared By: MinatoTW**

**Machine Author: H4d3s**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 13


## **SYNOPSIS**

Luke is a medium difficulty Linux box featuring server enumeration and credential reuse. A

configuration file leads to credential disclosure, which can be used to authenticate to a NodeJS

server. The server in turn stores user credentials, and one of these provides access to a

password protected folder containing configuration files. From this, the Ajenti password can be

obtained and used to sign in, and execute commands in the context of root.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - NodeJs enumeration



Page 2 / 13


## **ENUMERATION** **NMAP**





FTP is open with anonymous access allowed. There are two apache web servers running on port

80 (hosting the Ajenti which is a server management application) and 8000. Port 3000 is running

a Node server with Express framework.


Page 3 / 13


## **FTP**

Logging into FTP as anonymous we find a folder with a text file. Download it using GET.





The note says that he placed the source code somewhere on the server.



Page 4 / 13


## **HTTP**

Browsing to port 80 we see a normal web application.

## GOBUSTER


Gobuster is ran with the medium dirbuster wordlist and PHP extension. We’ll also search for 401

unauthorized codes in case of basic auth pages.





Page 5 / 13


We see login.php and config.php files. Let’s see what config.php holds.


It contains the PHP code to establish a database connection. Let’s check login.php.


It’s a normal login page and trying the credentials from config.php fails. Let’s check out
/management now.


Page 6 / 13


This needs us to authenticate in order to view the content. Let’s save this for later. Apart from

these, there’s a /member directory which is empty.

## **NODE SERVER**


Navigating to port 3000 we receive an error message.


This is due to the absence of the Authorization header with a JWT cookie.

## GOBUSTER


Let’s run gobuster on port 3000 to discover any other paths.





We see /login and /users. Let’s see what they contain.



Page 7 / 13


Going to /login we see a message “please auth”.


Let’s try sending it a POST request with curl with some credentials.





The page replies with forbidden. Let’s try again with the credentials we gained earlier.





This also returns a forbidden message. However, after changing the username to “admin”

authentication is successful.


Now we have the JWT cookies and can authenticate against the previous application.





Page 8 / 13


And we see the Welcome message. Let’s view the /users path using this cookie.





We see the user information and their roles. Let’s try going to /users/:username.



Page 9 / 13


The request is successful and we receive new credentials for Admin. The process is repeated for

the other three users.


Page 10 / 13


## **FOOTHOLD**

After checking these credentials against the /management page, we find that the user Derry can

login.


Once logged in, we’ll find the configuration files and the login.php file. The config.php and

login.php are same as earlier but the config.json is different.


It seems to be the configuration for Ajenti on port 8000. Scrolling down a bit we see the

password :


Page 11 / 13


​ ​


## **AJENTI**

The credentials root / KpMasng6S5EtTy9Z​ are used to login to Ajenti. ​


On the navigation bar to the left, there’s a “Terminal” tab. Click on this, click “New”, and then click

on the terminal. This should open up a root terminal.


A shell can be gained by using nc.


Page 12 / 13



​ ​



​ ​


And we are root !



Page 13 / 13


