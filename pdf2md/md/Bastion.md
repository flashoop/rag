# Bastion

*Converted from: Bastion.pdf*

---

# Bastion
## **20 [th] May 2019 / Document No D19.100.36**

**Prepared By: MinatoTW**

**Machine Author: l4mpje**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 10


## **SYNOPSIS**

Bastion is an Easy level WIndows box which contains a VHD ( Virtual Hard Disk ) image from

which credentials can be extracted. After logging in, the software MRemoteNG is found to be

installed which stores passwords insecurely, and from which credentials can be extracted.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - Extracting passwords from SAM

  - Exploiting MRemoteNG


Page 2 / 10


## **ENUMERATION** **NMAP**




## **SMB**

Let’s check if there are any open shares on SMB using null bind.





We notice a share named Backups which isn’t common. Let’s check its contents.





Among other files we find a VHD file in the backup folder.


VHD files are backups of the filesystem of Physical or Virtual machines. As the file size is
considerably large we’ll have to shift to Windows to browse it remotely.


Page 3 / 10


​


## **INSPECTING THE VHD**

On a Windows VM establish a VPN connection and connect to the share. Make sure you have

[7-zip​](https://www.7-zip.org/download.html) installed.


Navigate to the VHD file > Right click > 7 zip and click open here. The process could take a while

to complete.


The SAM ( Security Account Manager ) file on Windows is used as a database to store the hashes

for the users on Windows. We can extract hashes from it and attempt to crack them.


To crack the DB we need the SAM and SYSTEM hives. They are located at

C:\WIndows\System32\config\SAM and C:\Windows\System32\config\SYSTEM. Once the archive

opens navigate to the config folder.


Page 4 / 10



​



​



​


​ ​



Right-click on the SAM and SYSTEM files > Copy to > Select a location on local disk and then

copy it. Once it’s copied transfer the files to Linux and crack them using samdump2.


​ ​



​ ​



​ ​



​ ​



We obtained the NTLM hash for user l4mpje and the other disabled accounts. Let’s copy the NT

[hash to a file and crack on HashKiller​](https://hashkiller.co.uk/Cracker) .​


The hash is cracked as bureaulampje.


Page 5 / 10



​ ​


## **FOOTHOLD**

Using the credentials l4mpje / bureaulampje we can now login via SSH.





We can now read the flag on the Desktop.



Page 6 / 10


​


## **PRIVILEGE ESCALATION** **ENUMERATION**

Let’s enumerate the installed programs on the box.


​



​



​



​



We find mRemoteNG to be installed. A quick google search about it says that it’s a remote
connection manager and stores credentials too.

Looking at the changelog.txt we that the version is 1.76.11.


According to the article, [http://hackersvanguard.com/mremoteng-insecure-password-storage/​](http://hackersvanguard.com/mremoteng-insecure-password-storage/)


Page 7 / 10



​


​



mRemoteNG uses insecure storage methods making is vulnerable to credential disclosure. From

the changelog.txt we know that the fix wasn’t made in the older versions. So we can possibly

decrypt the credentials.


[We can decrypt them using the program, first download it from https://mremoteng.org/download​](https://mremoteng.org/download)

and then grab then configuration file.


The software stores it’s configuration in C:\Users\UserName\AppData\Roaming\mRemoteNG in

the file confCons.xml. Let's check it out.


We see that the file does exist. Let’s transfer it using SCP.



​



​



​



​



​


Now open up the application and Right Click on Connections, then select import then select

"Import from File".


Page 8 / 10


Now navigate to the confCons.xml file and import it. Once it’s imported go to Tools > External

Tools. Then right-click in the white space and choose New External Tool. Next, in the External

Tools Properties, fill in a Display Name, Filename and some arguments, with Password lookup,





Now right click on DC and click on Tools > New External Tool name.


A prompt should appear above which the password is echoed.



Page 9 / 10


We obtain the password as thXLHM96BeKL0ER2. We can now SSH in as the Administrator.


And we have a shell as administrator.


Page 10 / 10


