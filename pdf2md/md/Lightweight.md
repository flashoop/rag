# Lightweight

*Converted from: Lightweight.pdf*

---

# Lightweight

## **27 [th] April 2019 / Document No D19.100.17**

**Prepared By: MinatoTW**

**Machine Author: 0xEA31**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 16


## **SYNOPSIS**

Lightweight is a pretty unique and challenging box which showcases the common mistakes made

by system administrators and the need for encryption in any kind protocol used. It deals with the

abuse of Linux capabilities which can be harmful in bad hands and how unencrypted protocols

like LDAP can be sniffed to gain information and credentials.


## **Skills Required**


  - Linux Enumeration

  - LDAP Enumeration


## **Skills Learned**


  - Passive Sniffing

  - Abusing Linux Capabilities



Page 2 / 16


## **ENUMERATION** **NMAP**




## **LDAP ANONYMOUS BIND**

Enumerating LDAP by using anonymous bind. The base dn used will be “dc=lightweight,dc=htb”

as reported by nmap scan. The results contain quite a number of objects consisting of usernames

ldapuser1 and ldapuser2 along with their encrypted hashes.





The flag -h is used to specify the host, -x to specify anonymous bind and -b to mention the
Basedn to use.





Page 3 / 16


Page 4 / 16


Page 5 / 16


Page 6 / 16


## **APACHE - PORT 80**

On port 80 there’s a website which prevents bruteforcing so that we can’t use tools like gobuster

or dirbuster.


The status tab lists the IP addresses blocked by the server and the user tab automatically adds a

user on the box with username and password equal to our IP address.

## **FOOTHOLD**


With the credentials provided it’s possible to login to the box using ssh.


Page 7 / 16


This lands us into a low privilege shell restricted by SELinux.

## **ENUMERATION**


After gaining a shell LinEnum.sh is executed with thorough mode enabled to enumerate the box.





On running the script an unusual binary is seen with it’s capability bit set. Linux capabilities is a
feature which helps System Administrators to give a binary certain permissions which are needed
to perform daily tasks without giving a user root permissions or making it a setuid binary. To read
more refer to the manpage i.e “man capabilities” or visit this page [http://man7.org/linux/man-pages/man7/capabilities.7.html .](http://man7.org/linux/man-pages/man7/capabilities.7.html)


The binary is tcpdump which is supposed to be run as root as it needs raw socket access.


The binary tcpdump has cap_net_admin,cap_net_raw+ep capabilities enabled.





Page 8 / 16


According to the man page cap_net_admin provides the ability to perform network related
operations whereas cap_net_raw allows binding to ports and creating raw packets. The option
ep stands “effective and permitted” using a + sign means adding the capability.


This privilege can be abused by sniffing OpenLDAP traffic as it uses unencrypted connections in
order to find credentials or information from bind requests.





The -i flag is used to specify the interface to sniff which is localhost in this case. We sniff on port
389 and turn on verbose to see the captured packets. Let it run for 5 - 10 minutes and then
transfer it over to inspect.


While it is running, we can visit each webpage to generate traffic which will be captured in the
tcpdump packets.


Page 9 / 16


It sniffed 11 packets valid for our filter. Transfer it and open it in wireshark.





It shows ldapuser2 making a bindRequest to localhost which succeeds.


Right click on the packet > Follow > TCP Stream.


Set the direction towards port 389. The password for ldapuser2 got captured in clear text as
“8bc8251332abe1d7f105d3e53ad39ac2” as there was no encryption enabled.


Page 10 / 16


## **LATERAL MOVEMENT**

The password gained by sniffing can be used to su as ldapuser2.




## **CRACKING THE ZIP**

There’s backup.7z in the folder which is transferred locally to examine.





Page 11 / 16


On trying to extract the files it is found to be password protected. The password for ldapuser2
doesn’t work. So let’s try to crack it using john and rockyou.txt.


The program 7z2john.pl from John-the-ripper suite helps in creating a hash for the 7z archive.





In a couple of minutes the password should be cracked and it’s “delete”. Extracting the contents
results in few php files which are running on the server.





On examining the files, the file status.php contained the logic responsible for interacting with the


Page 12 / 16


LDAP server from which we obtain the password for ldapuser1.


Now we can login as ldapuser1 with the password we just obtained.



Page 13 / 16


## **PRIVILEGE ESCALATION** **LINUX CAPABILITIES**

After logging in as ldapuser1 enumeration is done using LinEnum.sh or even manually. Listing the

binaries with capabilities enabled fetches a new binary.


We notice openssl apart from the others which we had found earlier. The capability set ep as

discussed earlier stands for “effective and permitted” but there is no other capability attached to

it. From the manpages,


So by assigning empty capability to openssl it gets the permission to execute at uid 0.


Page 14 / 16


Lets try to read a privileged file using openssl like /etc/shadow.





It can be seen that openssl was able to read the shadow file due to it’s capabilities set even when
we are a normal user.

## GETTING A SHELL AS ROOT


Now that we can read and write to files, we can overwrite a sensitive file like /etc/crontab with a

reverse shell to execute as root.





And as expected the /etc/crontab gets overwritten by our version.



Page 15 / 16


And a shell should be received within a minute.



Page 16 / 16


