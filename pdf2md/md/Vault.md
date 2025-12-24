# Vault

*Converted from: Vault.pdf*

---

# Vault
## **3 [rd] April 2019 / Document No D19.100.12**

**Prepared By: egre55**

**Machine Author: nol0gz**

**Difficulty: Medium**

**Classification: Official**



Page 1 / 13


## **SYNOPSIS**

Vault is medium to hard difficulty machine, which requires bypassing host and file upload

restrictions, tunneling, creating malicious OpenVPN configuration files and PGP decryption.


## **Skills Required**


  - Basic knowledge of Web application

enumeration techniques

  - Intermediate knowledge of Linux


## **Skills Learned**


  - Creating malicious OpenVPN

configuration files

  - SSH port forwarding

  - Bypassing port restrictions using ncat


Page 2 / 13


## **Enumeration** **Nmap**





Nmap output reveals that SSH and an Apache web server are available. Visual inspection of the

website reveals some text about a service that is being offered.


Page 3 / 13


## **Wfuzz**

Cewl is used to generate a wordlist based on words found on the site, and wfuzz finds the

directory "sparklays".





Navigating to this page results in a 403 Forbidden, so enumeration with wfuzz continues.





Page 4 / 13


The page "admin.php", directory "design" and subdirectory "uploads" have been found.


After sending this request to Burp, and changing the Host header value to "localhost", the admin

page is accessible.


"Design Settings" links to "/sparkleys/design/design.html"


Page 5 / 13


​


## **Foothold (192.168.122.1)** **Bypassing File Upload Restriction**

The "Design Settings" page provides functionality to upload a logo, although there are

restrictions on the file extension. However, php5 extensions are permitted.


After uploading and executing a php reverse shell (e.g. in Kali

/usr/share/webshells/php/php-reverse-shell.php), a foothold on "Ubuntu" (192.168.122.1) is

received.


There is a user "dave", and enumeration reveals SSH credentials and other useful information on

their desktop.


SSH: **dave:Dav3therav3123** ​

Key: itscominghome

Server: 192.168.122.4


Page 6 / 13



​


## **SSH Port Forwarding**

A netcat scan of 192.168.122.4 reveals that ports 22 and 80 are open.





SSH is used to forward port 80 on 192.168.122.4 to port 8000 locally.



Page 7 / 13


## **DNS (192.168.122.4)** **Malicious OpenVPN Configuration File**

The webpage contains functionality to edit and test an OpenVPN configuration file.


Wfuzz finds the file "notes".


This reveals that the .ovpn file has been chmod 777, and is editable by www-data.



Page 8 / 13


An informative blog post by Jacob Baines details the exploitation of OpenVPN configuration files.


[https://medium.com/tenable-techblog/reverse-shell-from-an-openvpn-configuration-file-73fd8b1d](https://medium.com/tenable-techblog/reverse-shell-from-an-openvpn-configuration-file-73fd8b1d38da)

[38da](https://medium.com/tenable-techblog/reverse-shell-from-an-openvpn-configuration-file-73fd8b1d38da)


Using this as reference, the payload below is created, and after clicking "Test VPN", and reverse

shell is received as root@DNS, and the user flag on Dave’s desktop can be captured.





SSH credentials to access 192.168.122.4 are found in Dave’s home directory. Dave is able to run

any command as root using sudo.


**dave:dav3gerous567**


Page 9 / 13


## **Vault (192.168.5.2)**

The file /var/log/auth.log is examined, and interesting nmap and ncat commands targeting

192.168.5.2 are visible.


Nmap reveals the closed ports 53 and 4444. Specifying either port 53 or 4444 as the source port

reveals that port 987 is open.


ncat (with source port set to 53) reveals that SSH is listening on port 987.


A ncat listener is stood up, to connect to 192.168.5.2 on port 987.


Page 10 / 13


It is now possible to ssh to Vault as Dave using the password dav3gerous567, specifying port

4444.


Page 11 / 13


## **PGP Encrypted Root Flag**

Enumeration of Dave’s home directory reveals a PGP encrypted root flag. GPG can be used to

decrypt this, and it is installed on all hosts. However, there are no keys on Vault or DNS. The ID of

the key used to encrypt the file is "D1EB1F03".


Page 12 / 13


A further ncat listener is established in order to transfer to the file from Vault to DNS using SCP.


This is then transferred to Ubuntu.





The file is successfully decrypted using the passphrase "itscominghome" and the root flag is

captured.


Page 13 / 13


