# Arkham

*Converted from: Arkham.pdf*

---

# Arkham
## **15 [th] May 2019 / Document No D19.100.30**

**Prepared By: MinatoTW**

**Machine Author: MinatoTW**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 22


## **SYNOPSIS**

Arkham is a medium difficulty Windows box which needs knowledge about encryption, java

deserialization and Windows exploitation. A disk image present in an open share is found which

is a LUKS encrypted disk. The disk is cracked to obtain configuration files. The Apache MyFaces

page running on tomcat is vulnerable to deserialization but the viewstate needs to encrypted.

After establishing a foothold an Outlook OST file is found, which contains a screenshot with a

password. The user is found to be in the Administrators group, and a UAC bypass can be

performed to gain a SYSTEM shell.


## **Skills Required**


  - Enumeration

  - Scripting

  - Basic Cryptography


## **Skills Learned**


  - Java Deserialization

  - UAC bypass



Page 2 / 22


## **ENUMERATION** **NMAP**





IIS is running on port 80 along with SMB and Apache tomcat at their respective ports.



Page 3 / 22


## **SMB**

Lets use smbclient to bind with a null session to list open shares.





We find a share named BatShare, connect to it and list the contents.





As the file is large in size, we’ll mount the share and then copy the file.





And then unzip it to view the contents.





Page 4 / 22


## **CRACKING THE DISK IMAGE**

After extracting the zip we find a note which says the backup image is from a Linux server and a

backup image. Running "file" on the image says that it’s a LUKS encrypted disk, which is possible

to crack.


Follow these steps to crack the disk.





It could take a while to crack. Once done the password is found to be “batmanforever”.


Now we need to open and mount the disk.





After mounting we find some images and tomcat configuration files which can be useful later.


Page 5 / 22


​


​ ​


## **APACHE TOMCAT**

Navigating to port 8080 we find a normal blog.


Most of the options seem useless however clicking on subscription takes us to another page

[http://10.10.10.130:8080/userSubscribe.faces. ​](http://10.10.10.130:8080/userSubscribe.faces)


The page extension suggests that it’s an Apache MyFaces installation. A google search about

Apache MyFaces vulnerabilities shows an RCE exists in it due to insecure deserialization of JSF

viewstates [here​](https://www.alphabot.com/security/blog/2017/java/Misconfigured-JSF-ViewStates-can-lead-to-severe-RCE-vulnerabilities.html) .​ Viewing the source of the page, we see that javax ViewState is present.


Page 6 / 22



​


​ ​



​


​ ​


​



​


## **EXPLOITING DESERIALIZATION**

Going back to the tomcat configuration files we found earlier it’s seen that the page uses

encrypted viewstates from the web.xml.bak file.


​



​



​



​



It’s also seen that the viewstate is saved on the server side. So, we’ll have to create a malicious

viewstate and then encrypt it using the parameters we already have.

## CREATING SERIALIZED PAYLOAD


[Ysoserial​](https://github.com/frohoff/ysoserial) is a tool used to create malicious serialized payloads. Download the jar from JitPack,

make sure you have openjdk-8 installed.



​



​



​


Page 7 / 22


​ ​



​ ​



​ ​



We have a lot of payloads but let’s go with the common ones i.e CommonsCollections. Lets see if

we can ping ourselves first.


​ ​



​ ​



​ ​



In order to encrypt the payload we’ll use python. The [documentation​](https://wiki.apache.org/myfaces/Secure_Your_Application) ​ says the default encoding is
DES with PKCS5 padding if not specified. We’ll use pyDes to create the payload.



​ ​



​ ​



​ ​


The following lines will encrypt our payload,



​ ​



​ ​



​ ​


The key is from the config file we found earlier. We initialize the object with the key, ECB mode
and PKCS5 padding and then encrypt the payload.

Next we need to create the HMAC. The HMAC is used to verify the integrity of the message. It is
calculated and appended to the message, so that it can be verified when it is received. From the
config we know that the HMAC algorithm is SHA1 and the key is same as the encryption.



​ ​



​ ​



​ ​


The above snippet creates the SHA1 hash of the encrypted payload from earlier. Make sure to
use raw bytes and not hexdigest. Then it is base64 encoded to be sent.


Page 8 / 22


Here’s the final script,





Page 9 / 22


The getViewState function just checks if the VIewState is present or not. The getPayload function
reads the payload from the file we created using ysoserial. Then encryption and hmac creation
takes place as discussed earlier. Then the payload is sent as a POST parameter for
javax.faces.ViewState.


Page 10 / 22


Running the script we see that our ping is returned.



Page 11 / 22


## **FOOTHOLD**

Now that we have RCE lets use nc.exe to get a shell. Start a simple HTTP server and then create

the payload to download and execute it.





And we get a shell as user Alfred.



Page 12 / 22


## **LATERAL MOVEMENT** **ENUMERATION**

While enumerating the file system we come across a zip file in the Downloads folder of the user.


Lets transfer it using the nc.exe we placed earlier.





And locally:





Page 13 / 22


Ignore the base64 error due to certutil padding. After unzipping we find the OST file.


An OST file is an offline folder file for Microsoft Outlook. It’s local copy of the user’s mailbox
which is stored in an email server such as Exchange. We can use readpst to open it up.





It finds one item in the Draft folder.


It creates an mbox file which can be opened using evolution or thunderbird.





In there we find a screenshot containing a password from Batman.



Page 14 / 22


Using the credentials Batman / Zx^#QX+T!123 we can now login via WinRM.





And we are Batman!



Page 15 / 22


## **PRIVILEGE ESCALATION** **ENUMERATION**

We look at the user’s groups and find that he’s in the Administrators group.


So we’ll have to stage a UAC bypass to get a SYSTEM shell. Looking at systeminfo we see that

the OS is Windows server 19.


There can be many ways to do a UAC bypass but there’s one specific to Server 19 and more

[guaranteed to work. According to ​https://egre55.github.io/system-properties-uac-bypass/ we can](https://egre55.github.io/system-properties-uac-bypass/)

bypass UAC through DLL hijacking via SystemPropertiesAdvanced.exe as it auto-elevates.


But as SystemPropertiesAdvanced is a GUI app we’ll need to be in session 1 to execute it as

PSRemoting uses session 0. So, we’ll get a meterpreter and migrate to a process in session 1.


Page 16 / 22


​ ​


## **GETTING A METERPRETER**

[We’ll use GreatSCT​](https://github.com/GreatSCT/GreatSCT) to get a meterpreter as we need to bypass AV. ​



​ ​



​ ​



​ ​


Lets create a msbuild/meterpreter/rev_tcp.py payload as it’ll be easy to evade.



​ ​



​ ​



​ ​



​ ​


Copy the payload.xml and start msf using the payload.rc file.



​ ​



​ ​



​ ​


Download the xml file onto the target and execute it using msbuild.



​ ​



​ ​



​ ​


The process should hang and we should get a session.



​ ​


Page 17 / 22


Now we need to migrate to a process in session 1. List all the processes using ps.


We see a svchost.exe process running as batman in session 1. Lets migrate to it.


Note: Incase the migration fails kill the session and try again. It might take 4 -5 attempts to
succeed.

## **DLL HIJACKING**


Now that we have a shell in session 1 we just need to create a malicious DLL and place it in the

WindowsApps folder to get it executed. Here’s a sample DLL,


Page 18 / 22


Page 19 / 22


Page 20 / 22


The DLL uses raw sockets to execute commands with cmd.exe and uses the sockets file

descriptors to send output and get input.


Compile it using mingw to a 32 bit DLL named srrstr.dll as that’s what the binary looks for.





When done upload it to the windowsapps folder as suggested by the article.





Once uploaded execute the binary C:\Windows\SysWOW64\SystemPropertiesAdvanced.exe or

any other SystemProperties* binary.





Page 21 / 22


We get a shell as batman, but however we have more privileges now.


And we can move into the Administrator folder to read the flag.



Page 22 / 22


