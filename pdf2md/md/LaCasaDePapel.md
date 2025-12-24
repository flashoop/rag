# LaCasaDePapel

*Converted from: LaCasaDePapel.pdf*

---

# LaCasaDePapel
## **11 [th] May 2019 / Document No D19.100.32**

**Prepared By: MinatoTW**

**Machine Author: Thek**

**Difficulty: Easy**

**Classification: Official**



Page 1 / 13


## **SYNOPSIS**

LaCasaDePapel is an easy difficulty Linux box, which is running a backdoored vsftpd server. The

backdoored port is running a PHP shell with disabled_functions. This is used to read a CA

certificate, from which a client certificate can be created. The HTTPS page is vulnerable to LFI,

leading to exposure of SSH keys. A configuration file can be hijacked to gain code execution as

root.


## **Skills Required**


  - Enumeration


## **Skills Learned**


  - Linux inode knowledge

  - Creating client certificates



Page 2 / 13


## **ENUMERATION** **NMAP**





There’s vsftpd running on port 21 along with HTTP and HTTPS on their respective ports.


Page 3 / 13


​


## **HTTP**

Navigating to port 80 we find a page which needs an OTP supplied by a QRCode. The page asks

[us to install Google Authenticator​](https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2)


Scanning the code using Google Authenticator on an Android phone gives us a code but it

refuses to work either way. So, maybe it’s for internal users only. Let’s keep this aside and come

back later.

## **HTTPS**


Browsing to HTTPS shows us an error that we need a client certificate to continue which we don’t

possess at the moment.


Page 4 / 13



​



​


​


​ ​


## **VSFTP**

[As seen from nmap, VSFTP is version 2.3.4. A quick google search about it yields ​this. It seems​](https://www.exploit-db.com/exploits/17491)

that this version was backdoored. Let’s try to replicate the exploit code.


The code just tries a failed login, which triggers the backdoor on port 6200 and then executes

commands from it. Let's do that using a small python script.


​ ​



​


​ ​



​


​ ​



​


The code is pretty simple, it just creates a connection to the FTP port, sends in commands and

then quickly connects to the backdoored port at 6200. Running the script,


We see that instead of being a system shell it’s a Psy shell. Searching about the Psy Shell we find

that it’s an [interactive debugger​](https://psysh.org/) for PHP. So this should allow us to execute PHP commands. ​


Page 5 / 13



​


​ ​


## **PSY SHELL**

Let’s try executing system commands using the `cmd` operator.


We find that shell_exec is disabled which prevents us from executing system commands.

However we can still list directories and read files using scandir() and file_get_contents().







Page 6 / 13


We already know that we need a client certificate to access the service on HTTPS. In order to

create one we need the CA certificate. Let’s find it.


Looking at the home folders of the users we see five users.


Let’s inspect each one of them. After some enumeration we see ca.key in /home/nairobi.


Let’s read its contents and copy it into a file.


Page 7 / 13


​ ​


## **CREATING CLIENT CERTIFICATE**

Now that we have the CA certificate let’s create a client certificate for ourselves. To create it first

download the server certificate. Navigate to [https://10.10.10.131​](https://10.10.10.131/), then click on the lock icon on the ​

URL bar.


And then Connection > More Information > View Certificate. Then in the popup window click on

Details > Export.


Export and save it in the folder.


Then follow these steps to create the certificate,



​ ​



​ ​



​ ​



​ ​


You should be left with a .p12 file which is the certificate.



​ ​


Page 8 / 13


Now upload the client.p12 to the browser’s store. In firefox, go to Preferences > Privacy & Security

- View Certificates. Then in the Your Certificates section click on Import and import the cert.


Navigating to the page now should prompt for certificate selection, and we should get into the
private area.


Clicking on a season takes us to a video downloader. The link to the folder is like,





Let's change it to see if we can traverse folders.



Page 9 / 13


We see that it’s possible to traverse folders.

Looking at the URL to download the videos, it’s of the form.





Decoding the base64 part we see that it’s a path to the video,


Let's change it to ../.ssh/id_rsa to see if it works.





The -n flag is to avoid the new line.



Page 10 / 13


## **FOOTHOLD**

Now let’s try the path to read id_rsa.





We see that it worked and we have the private key. Copy it to a file and use it to ssh in. As we
don’t know the username yet, we’ll try each one from the list we obtained earlier.

Trying each one of them we find that the key belongs to “professor”.


Page 11 / 13


​ ​


## **PRIVILEGE ESCALATION**

Let’s enumerate the running crons using [pspy​](https://github.com/DominicBreuker/pspy) .​



​ ​



​ ​



​ ​


After running it for a while we find this,


The file is located in our home folder, let’s check it out.


We see that it’s owned by root, but we don’t have read or write permissions to it. However,

there’s another file named memcached.ini which is readable. Let’s see what it has,


It looks like it’s the configuration used by supervisord, which handles the services, and we see

the command we saw earlier using pspy.


Page 12 / 13



​ ​



​ ​



​ ​


​ ​



Even though we can’t write to the file, we own the folder or the [inode​](https://en.wikipedia.org/wiki/Inode) .​ An inode is a data

structure which stores the file and folder information. Using this to our advantage we can rename

the file. Renaming a file just changes the inode mapping and not it’s permissions.



​ ​



​ ​



​ ​



​ ​


We see that the file permissions are the same, and only the file is renamed. Let’s create a script

which sends us a reverse shell.



​ ​



​ ​



​ ​


Now go back to our home folder and create a new memcached.ini with the following contents.



​ ​



​ ​



​ ​


Now when the cron runs the next time, we should have a root shell.


And we have a root shell.



​ ​



​ ​


Page 13 / 13


