# Querier

*Converted from: Querier.pdf*

---

# Querier
## **29 [th] May 2019 / Document No D19.100.26**

**Prepared By: MinatoTW**

**Machine Author: egre55 & mrh4sh**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 12


## **SYNOPSIS**

Querier is a medium difficulty Windows box which has an Excel spreadsheet in a world-readable

file share. The spreadsheet has macros, which connect to MSSQL server running on the box. The

SQL server can be used to request a file through which NetNTLMv2 hashes can be leaked and

cracked to recover the plaintext password. After logging in, PowerUp can be used to find

Administrator credentials in a locally cached group policy file.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - Excel macros

  - PowerView



Page 2 / 12


## **ENUMERATION** **NMAP**





There’s SMB and WinRM open among other common ports. MSSQL is running too which confirms

that the domain is HTB.LOCAL.


Page 3 / 12


## **SMB**

smbclient is used to bind using a null session and list available shares.





We find the Reports share among other common shares. Connect to it to see the contents.





There’s an xlsm file which is a macro-enabled Excel spreadsheet. Download it to examine.


Page 4 / 12


​ ​


## **INVESTIGATING THE SPREADSHEET**

The spreadsheet is extracted.


​ ​



​ ​



​ ​



​ ​



Macros are usually stored at xl/vbaProject.bin. Use strings on it to find all readable strings.


​ ​



​ ​



​ ​



Close to the top the connection string can be found with the credentials.


Using these we can now login using impacket mssqlclient.py, use -windows-auth​ as it’s the ​
default mode of authentication for SQL Server.


Page 5 / 12



​ ​



​ ​


We can use xp_cmdshell utility to execute commands through the SQL server. Let’s try that out.


However, we are denied access. This is because we aren’t an SA level user and don’t have

permissions to enable xp_cmdshell. Let’s see users who have SA privilege.





We see that we don’t have SA privileges. Though we can’t execute commands using
xp_cmdshell we can steal hashes of the SQL service account by using xp_dirtree or xp_fileexist.





And fire up Responder locally.



Page 6 / 12


## **CRACKING THE HASH**

Copy the hash into a file to crack it. And use John the Ripper to crack the hash and rockyou.txt as

the wordlist.





The hash is cracked as “corporate568”.



Page 7 / 12


​ ​


## **FOOTHOLD**

Using the creds mssql-svc / corporate568 we can now login to MSSQL. Let’s check if we have SA

permissions now.


​ ​



​ ​



​ ​



​ ​



And we see that it returns true. Now, to execute commands use xp_cmdshell.


​ ​



​ ​



​ ​



​ ​



Now we can execute a TCP Reverse shell from [Nishang​](https://github.com/samratashok/nishang/blob/master/Shells/Invoke-PowerShellTcp.ps1) .​ Download the script and add this line to
the end of it.



​ ​



​ ​



​ ​


Now run a simple HTTP Server and execute it using powershell.



​ ​



​ ​



​ ​


Page 8 / 12


And we have a shell.



Page 9 / 12


​ ​


## **PRIVILEGE ESCALATION**

After getting a shell, [PowerUp.ps1​](https://github.com/PowerShellMafia/PowerSploit/blob/dev/Privesc/PowerUp.ps1) is used to enumerate further. Download the script and execute ​

it on the server using Invoke-AllChecks.



​ ​



​ ​



​ ​


After the script runs it finds credentials in the cached Group Policy Preference file,


If sysadmins attempt to mitigate the GPP vulnerability by deleting the associated GPO, the
cached groups.xml files will remain on the end points. However, if the GPO containing the GPP
setting is unlinked from the GPO, the cached groups.xml files will be removed.

This can be done manually too,



​ ​



​ ​



​ ​



​ ​


Page 10 / 12


​ ​



Copy the value for cpassword and put into this script,


​ ​



​ ​



​ ​



It uses the predefined key and known AES algorithm to decrypt the password. Running the script
gets the password,


Using the credentials Administrator:MyUnclesAreMarioAndLuigi!!1!​, we can now login as ​
the local Administrator via psexec.



​ ​



​ ​



​ ​



​ ​


Page 11 / 12


And we have a SYSTEM shell.



Page 12 / 12


