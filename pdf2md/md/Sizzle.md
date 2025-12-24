# Sizzle

*Converted from: Sizzle.pdf*

---

# Sizzle
## **08 [th] May 2019 / Document No D19.100.21**

**Prepared By: MinatoTW**

**Machine Author: mrb3n and lkys37en**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 20


## **SYNOPSIS**

Sizzle is an “Insane” difficulty WIndows box with an Active Directory environment. A writable

directory in an SMB share allows to steal NTLM hashes which can be cracked to access the

Certificate Services Portal. A self signed certificate can be created using the CA and used for

PSRemoting. A SPN associated with a user allows a kerberoast attack on the box. The user is

found to have Replication rights which can be abused to get Administrator hashes via DCSync.


## **Skills Required**


  - AD Enumeration

  - Mimikatz usage


## **Skills Learned**


  - Stealing hashes

  - Passwordless login

  - Kerberoasting

  - DCSync



Page 2 / 20


## **ENUMERATION** **NMAP**





A lot of open ports common to Windows AD.





Page 3 / 20


Running service scan on the common ports,





Page 4 / 20


Nmap finds the Domain to be HTB.LOCAL and the FQDN is sizzle.htb.local. Anonymous ftp login
is allowed. Both http and https are running IIS and WinRM could be used later to login.

## **IIS SERVER**


Both http and https servers have the same image on them.

## GOBUSTER


Running gobuster on both ports.





Page 5 / 20


## **FTP ENUMERATION**

Anonymous login was allowed on FTP but it had no contents.

## **SMB ENUMERATION**


Connecting to SMB via a NULL session and listing the shares finds two uncommon shares,

Department Shares and Operations share. CertEnroll is a default AD CS share but the other two

are local.





Connect to the share to examine its contents. The share can be mounted locally.



Page 6 / 20


​ ​



​ ​



​ ​



We land in a share with a lot of folders, out of which some might be writable. A small bash script
can determine this.


​ ​



​ ​



​ ​



​ ​



The script returns in a while and finds two folders to be writable.

## **CERTSRV**


[Searching about AD CertEnroll takes us to this page​](https://social.technet.microsoft.com/wiki/contents/articles/7734.certificate-enrollment-web-services-in-active-directory-certificate-services.aspx) .​ According to it, the web service is

accessible at /certsrv. Checking this on Sizzle we find that the service is running. But it’s

password protected.


Page 7 / 20


## **STEALING HASHES**

As we found a few writable folders earlier we could implant an .scf file so that it sends us the

user’s hashes when he opens the share.


Create an scf file with contents,





Copy it to the writable folders and fire up Responder.





After a while we should receive hashes on Responder for amanda.


Copy the hash into a file and crack it with john and rockyou.





The password is cracked as Ashare1972.



Page 8 / 20


​ ​


​ ​


## **FOOTHOLD**

Now that we have a password lets try to login through WinRM. I’ll be using this ruby [script​](https://github.com/Alamot/code-snippets/blob/master/winrm/winrm_shell.rb) .​


Change the configuration to suit our requirement. Trying to login fails because the server expects

certificate based authentication. For that we need to create certificates signed by the AD CS.

More on passwordless WinRM [here​](http://www.hurryupandwait.io/blog/certificate-password-less-based-authentication-in-winrm) .​

## **CREATING CERTIFICATES**


We can login to the AD CS web page using the obtained credentials. To create a certificate first

we’ll need to create a CSR (Certificate Signing Request). We can use openssl to do the job.



​ ​


​ ​



​ ​


​ ​



​ ​


​ ​


Enter a passphrase when prompted and the same while creating the CSR. Press enter through all
the prompts.


We should be left with a private key and a csr. Now to request a certificate sign-in to /certsrv.


Page 9 / 20



​ ​


​ ​



​ ​


​ ​


Click on Request a certificate and then advanced certificate request.
Now copy the csr contents and paste it into the box. Leave the rest as it is.


Click on submit and download the certificate as base64 encoded.


Ruby WinRM supports certificate based authentication.



Page 10 / 20


## **LOGGING IN TO WINRM**

Make the following changes to the script.





Now execute the script and enter the password you used while creating the certificate.





And we have a shell.



Page 11 / 20


​ ​


## **LATERAL MOVEMENT** **COVENANT**

Now that we have a shell, lets use Covenant to have a better grip and enumerate the AD.

[Covenant is a versatile framework written in dotnet core. More on it here​](https://posts.specterops.io/entering-a-covenant-net-command-and-control-e11038bcf462) . ​


Start Covenant and then Elite.



​ ​



​ ​



​ ​


Once both are up and running start a Listener on elite.



​ ​



​ ​



​ ​



​ ​


Now we create a Launcher which is a stager for Covenant. Lets create a binary launcher.



​ ​



​ ​



​ ​


The file pwn.exe is created and hosted on the server.



​ ​


Page 12 / 20


Download the file on the box directly using wget. Before executing it we need to bypass
applocker. This can be simply done by copying the binary to
C:\Windows\System32\spool\drivers\color.





We get a hit on our listener and the Grunt is active. Let’s interact with it.





Page 13 / 20


## **ENUMERATION**

Now lets enumerate the domain. Use the command GetDomainUser to get a list of users in the

domain.


Apart from the common accounts and amanda, we find three other accounts.





Page 14 / 20


Both sizzler and Administrator are Domain Admins. There appears to be an SPN associated with

the user mrlky.


This can be confirmed by using the built-in utility setspn.exe.





On running it we find the SPN entry for mrlky.


This allows us to kerberoast and get his hash.

## **KERBEROAST**


In order to kerberoast we need to make a token using our credentials as the WinRM used

certificate based authentication and not credential based.


This is what happens without a token. It errors out due to invalid credentials.


Page 15 / 20


Use MakeToken to create a token of logontype 2 which is used for a normal login. And then use

kerberoast.





And we receive the hash. Copy it to a file and crack it using hashcat,





The password is cracked as Football#7 .


Now we can use this to get a shell as mrlky. Repeat the same process as amanda to create a csr

and generate a certificate to get a shell as mrlky. Execute the same binary to get a grunt as mrlky.


Page 16 / 20


​ ​



​ ​


## **PRIVILEGE ESCALATION**

[Lets import PowerView and enumerate the domain. Download PowerView.ps1​](https://raw.githubusercontent.com/PowerShellMafia/PowerSploit/dev/Recon/PowerView.ps1) into the data ​

folder.



​ ​



​ ​



​ ​


Now lets see which users have Replication Rights in the DC.



​ ​



​ ​



​ ​


Running this we find an object with SID S-1-5-21-2379389067-1826974543-3574127760-1603

which possesses Replication Rights.


Page 17 / 20


And the SID belongs to mrlky.

## **DCSYNC**


Having the DS-Replication-Get-Changes-All privilege allows us to perform DCSync. Lets use

DCSync to get the Administrator hash.





Or using mimikatz,





Page 18 / 20


We obtain the NTLM hash as f6b7160bfc91823792e0ac3a162c9267 and the LM hash as
336d863559a3f7e69371a85ad959a675. Using this we can login via psexec or wmiexec with the
hash in the form LM:NTLM.




## **APPENDIX** **SETTING UP COVENANT**





Page 19 / 20


## **SETTING UP ELITE**




## **POWERVIEW COMMAND REFERENCE**

https://gist.github.com/HarmJ0y/184f9822b195c52dd50c379ed3117993

## **MIMIKATZ COMMAND REFERENCE**


https://github.com/gentilkiwi/mimikatz/wiki



Page 20 / 20


