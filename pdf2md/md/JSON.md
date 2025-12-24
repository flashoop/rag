# JSON

*Converted from: JSON.pdf*

---

# JSON

07 [th] February 2020 / Document No D20.100.58


Prepared By: MinatoTW


Machine Author(s): cyb3rb0b


Difficulty: Medium


Classification: Official


## **Synopsis**

JSON is a medium difficulty Windows machine running an IIS server with an ASP.NET application.

The application is found to be vulnerable to .NET deserialization, which is exploited using

ysoserial.net. A custom .NET program is found to be installed, which on reverse engineering

reveals encrypted credentials for an administrator. These credentials can be decrypted and used

to gain access to the FTP folder.
### **Skills Required**


Enumeration

Deserialization

Reverse Engineering
### **Skills Learned**


Using ysoserial.net

dnSpy


## **Enumeration**

### **Nmap**



A full-port Nmap scan reveals a Windows box running FTP and IIS servers on their default ports.

Nmap finds the OS version to be Windows 2008 R2 or 2012. WinRM is found to be open on port

5985, which could help with lateral movement later.
### **IIS**


A login page can be found on browsing to port 80.


The following request can be observed after turning on Burp intercept and trying to login.


After attempting to login using common credentials such as admin/admin, we gain access to the

dashboard.


Going back to the Burp, a GET request to /api/Account is observed.


The request contains a Bearer header with a base64 encoded value. The same value is observed

in the OAuth2 cookie. Let's decode it and look at the contents.


It appears to be JSON used by the server to identify the user. Let's try changing the values by

adding quotes to check if some kind of SQL injection is possible.

Single quotes are added to the Id and UserName values. Send the request to Repeater, and

swap the existing token with the forged one.

The server returns a 500 Internal Server Error, which states that the JSON.Net object can't

be deserialized. This informs us about two things; that the API is written in ASP.NET, and that the

server deserializes JSON objects that is receives. Searching for vulnerabilities related to JSON.Net

deserialization, we come across [ysoserial.net, which can generate .NET deserialization payloads.](https://github.com/pwntester/ysoserial.net)


Download the binary from the [releases](https://github.com/pwntester/ysoserial.net/releases) section and run it on a Windows box. Let's create a

payload to ping ourselves from the box.

The payload format is set to Json.Net and the gadget type is ObjectDataProvider . The -c flag

is used to specify the command to execute and the output format is set to base64. Copy the

generated payload and place it as the Bearer value in the HTTP request. Before sending the

request, start an ICMP listener using tcpdump .


The server throws an error in the response, but ICMP requests can be observed on the tcpdump

listener.


## **Foothold**

Having confirmed code execution, we can try getting a reverse shell on the box. We can use a

netcat binary to send a reverse shell to ourselves. Start an smbserver locally to host the binary.


Next, copy the nc.exe binary to the current folder, and create a JSON.Net payload for the

command:





The command above uses nc.exe present on our share to send a reverse shell to port 443.


Swap the older payload with the newly generated one and forward the request, after which a

shell as userpool should be received.


## **Privilege Escalation**

Looking at the installed programs, a program named Sync2Ftp is found to be installed.


The folder is found to contain a binary and configuration file. These could be of interest as the

application isn't standard, and could be user defined. Copy these files to the SMB share running

on our host.

Running file on the binary reveals that it's a .NET executable. The config file is found to contain

some encrypted fields and configuration values.



[dnSpy](https://github.com/0xd4d/dnSpy) can used to reverse and analyze .NET executables. Open up the binary in dnSpy x86 and

analyze the SyncLocation assembly.


Looking at the Main method, it's seen the binary creates a new service and registers the

Service1 object. Let's look at the Service1 class next.

The Start method ends up calling the Copy method.

The Copy method reads various values from the configuration file and then decrypts them using

the Crypto class. It then uses the FTP STOR command to transfer all files in the the

sourcefolder path to the FTP folder. Let's look at how the values are encrypted and decrypted.


The Encrypt method takes in two arguments, i.e. the string to encrypt and boolean value. It

reads the SecurityKey value from the config file, and hashes it using MD5 if useHashing is set

to true. The plaintext value is then encrypted using the 3DES encryption algorithm in ECB mode

with PKCS7 padding, and returned base64 encoded.


Similarly, the Decrypt method reads the key and hashes it based on the boolean value. It then

uses the 3DES algorithm to decrypt and return the plaintext string. Let's write a small python

script to decrypt this manually.


from pyDes import  

from base64 import b64decode


from hashlib import md5


key = b"_5TL#+GWWFv6pfT3!GXw7D86pkRRTv+$$tk^cL5hdU%"


hashedKey = md5(key).digest()


desKey = triple_des(hashedKey, ECB, padmode = PAD_PKCS5)


usernameData = b64decode("4as8gqENn26uTs9srvQLyg==")


username = desKey.decrypt(usernameData)


print(f"Username:


{username.decode()}")


passwordData = b64decode("oQ5iORgUrswNRsJKH9VaCw==")


password = desKey.decrypt(passwordData)


print(f"Password:


{password.decode()}")


The script uses the pyDes library to decrypt the username and password from the config file. The

securityKey is hashed using the MD5 algorithm. The decryption key is created using the

triple_des method, which is used to decrypt the username and password respectively.

Running the script returns the username superadmin and password funnyhtb . Let's try logging

into FTP with these credentials.


The login was successful and can be used to read the root flag.
### **Alternate Method**

As the userpool user is a service account, it holds the SeImpersonate privilege.


We can leverage this privilege on Windows server 2012 by using the [Juicy Potato](https://github.com/ohpe/juicy-potato/) exploit.

Download the binary from releases, and place it in the share. Next, copy JuicyPotato.exe as well

as nc.exe to the Public folder.


Create a bat file with a reverse shell command such as:





A list of CLSIDs for Windows Server 2012 can be found [here. Any CLSID belonging to](https://github.com/ohpe/juicy-potato/tree/master/CLSID/Windows_Server_2012_Datacenter) NT

AUTHORITY\SYSTEM can be used.


A shell as SYSTEM should be received on port 4444.


