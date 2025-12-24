# CTF

*Converted from: CTF.pdf*

---

# CTF
## **27 [th] May 2019 / Document No D19.100.24**

**Prepared By: MinatoTW**

**Machine Author: 0xEA31**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 18


## **SYNOPSIS**

CTF is an insane difficulty Linux box with a web application using LDAP based authentication. The

application is vulnerable to LDAP injection but due to character blacklisting the payloads need to

be double URL encoded. After enumeration, a token string is found, which is obtained using

boolean injection. Using the token an OTP can be generated, which allows for execution of

commands. After establishing a foothold, a cron can be exploited to gain sensitive information.


## **Skills Required**


  - Scripting


## **Skills Learned**


  - LDAP Injection

  - Wildcard and Symlink abuse



Page 2 / 18


## **ENUMERATION** **NMAP**





Apache is running on port 80 and SSH on port 22.



Page 3 / 18


## **APACHE**

Apache hosts a website which is protected from brute force attempts.


The login page requires an OTP to login.


Checking the source of the page we find a comment,


Maybe this is a hint towards the login being LDAP based, because LDAP contains schema and

attributes.


Page 4 / 18


​ ​


## **LDAP INJECTION**

Now lets try basic injection payloads like *)(uid=*​ . Where uid stores the user ID. ​


The server doesn’t reply back with any message. So maybe there’s character blacklisting. Let’s

send this to burp change the encoding.


By default a browser URL encodes it once, we can try encoding it again so that it’s double

encoded. The payload is,



​ ​



​ ​



​ ​



​ ​



​ ​


After sending it the server responded with “Cannot login”. So the LDAP query succeeded but

login failed due to wrong OTP.


Page 5 / 18


​



However, if we tried a payload like, *)(uid=a* the server would say username not found. That

means the uid doesn’t start with a.


Let’s try to find the username based on this boolean logic. The payloads will try a character each

until “Cannot login” is returned by the server. They’ll be of the form,


*)(uid=a* else *)(uid=b* and so on until a character satisfies the condition. Then we take ​

that character and proceed to the next.


It’ll be easier to script this,



​



​



​



​



​


Page 6 / 18


The script just checks for the first character of the uid attribute. Python requests module url

encodes the payload by default, so just need to encode it once more using urllib.quote. As seen

earlier having ‘Cannot found’ in response means that the query was valid. Running the script we

find ‘l’ to be the first character.


Lets extend the script to find the complete username. Make the following changes to the script.







The username list stores the characters and keeps checking the uid character by character. If

one is found then it’s pushed to the list and used for the next iteration.





The username is found to be ldapuser.



Page 7 / 18


​ ​



Now onto the password or token string here. As the comment suggested the token string is

stored in an existing attribute. So first we’ll have to find a suitable attribute which could store it.

We can brute force attributes based on the same logic as before.


​ ​



​ ​



​ ​



The page should return ‘Cannot login’ if the attribute is present else ‘Not found’. Lets script this. A

list of common LDAP attributes can be obtained [here​](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/LDAP%20Injection/Intruder/LDAP_attributes.txt) .​ Here’s the script,



​ ​



​ ​



​ ​


It reads an attribute from the file, plugs it into the query and sends it. Running the script,


Page 8 / 18



​ ​


All other attributes are common except pager. It stores only numbers, so it could contain the

token string. We write a script along the same lines as earlier.







We know the length of the token i.e 81. The sleep is to ensure that the server doesn’t block us.

Running the script for a while,



Page 9 / 18


The token obtained is:

285449490011357156531651545652335570713167411445727140604172141456711102716717000,

which is 81 digits in length.


A google search about it refers to stoken.


Where the 81 digits are of “Compress Token Format” or CTF, from which the box gets its name.


Page 10 / 18


## **GENERATING OTP**

Install stoken in order to create OTP.





Leave the password as empty and pin to 0000. Before we can generate OTP we need to sync

our time with that of the box. This can be achieved by obtaining the server’s time from the HTTP

headers and converting it to epoch format.





The script fetches the time from the server, converts it to a datetime object and adds difference

in the timezone. The difference is calculated from UTC.





Using the OTP we can now log in.



Page 11 / 18


## **FOOTHOLD**

After logging in we are taken to a page where we can issue commands.


Generating an OTP and issuing a command fails with an error saying “User must be member of

root or adm group and have a registered token to issue commands on this server”. So apart from

the username and OTP check there’s an extra filter for the user i.e group.


The ldap filter could be something like,





We can bypass this by closing the filters and a null byte like this,





Which will result in,





The part after the null byte gets ignored and the query evaluates to true.



Page 12 / 18


Lets try logging in now with an OTP. Use burp to intercept the login request because the browser

might remove the null byte. Double url encode the payload and add the OTP.


Now when we try to issue commands it should allow us to.


We can view the contents of the php files now, to avoid it getting executed use base64.





Page 13 / 18


Copy the output and decode it locally.





After decoding we find the credentials for ldapuser at the top.


Using these we can SSH into the server.



Page 14 / 18


## **PRIVILEGE ESCALATION** **ENUMERATION**

In the root folder of the box there’s a folder named backup. It consists of a script and various

backups.


Let's examine the script honeypot.sh.





Page 15 / 18


The script gets the list of banned IP addresses. It creates a filename based on timestamp and

salted hash using the contents of root.txt. Then it removes all but the last 10 backups. The script

then creates an archive using 7za from /var/www/html/uploads.





The interesting switch used here is -snl which according to the man page is used to preserve
symlinks and the wildcard which includes all files. We can abuse this by symlinking a file to
another sensitive file and using the @ operator for a listfile.

For example,





We can see that it tries to archives all files named with contents of passwd and sends it to the
stderr..Using this trick we can view a sensitive file like sudoers or shadow.


Page 16 / 18


​ ​


## **ABUSING THE CRON**

Though we don’t have write permissions to the uploads folder, the page we used to get RCE was

running as apache and can be used to create files.


Create two files listfile and @listfile,


​ ​



​ ​



​ ​



​ ​



​ ​



Run tail -f error.log​ on the box to see the errors. ​



​ ​


Page 17 / 18


From the timestamps on the zip we notice that the cron is run every 60 seconds.


Within a minute the contents of sudoers should be visible.


And we see the contents of sudoers line by line. The same trick can be used to read the root flag.


Page 18 / 18


