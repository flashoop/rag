# Shrek

*Converted from: Shrek.pdf*

---

# Shrek
## **19 [th] October 2017 / Document No D17.100.28**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: SirenCeol & Cowonaboat**

**Difficulty: Hard**

**Classification: Official**


Page 1 / 7


## **SYNOPSIS**

Shrek, while not the most realistic machine, touches on many different subjects and is definitely

one of the more challenging machines on Hack The Box. This machine features several fairly

uncommon topics and requires a fair bit of research to complete.


## **Skills Required**


  - Intermediate/advanced knowledge of

Linux

  - Intermediate understanding of

cryptography


## **Skills Learned**


  - Spectrogram analysis

  - Recognizing and decrypting elliptic

curve cryptography

  - Enumerating hidden tasks

  - Exploiting chown wildcards


Page 2 / 7


## **Enumeration** **Nmap**

Nmap reveals a vsftp server, OpenSSH and Apache.



Page 3 / 7


​ ​


​


## **Dirbuster**

Running Dirbuster reveals an / **uploads/** ​ folder that contains a file named ​ **secret_ultimate.php** .

Viewing the file in-browser does not reveal any useful information, but if it is downloaded with

**wget**, it reveals another directory named **/secret_area_51/** ​


Page 4 / 7



​ ​


​


​

​


## **Exploitation** **Steganography**

Using **Sonic Visualiser** ​ (apt-get install sonic-visualiser) on the mp3 file and viewing the

spectrogram ( **Pane > Add Spectrogram** ​ ) reveals some FTP credentials.



​

​



​

​


Page 5 / 7


​ ​

​


​


## **Elliptic Curve Cryptography**

In two of the txt files found on the FTP server, there are Base64 strings. Note that the filenames

change every time the machine is reset. Decoding the strings reveals some ciphertext and the

string **PrinceCharming** ​ . Using the **seccure** ​ Python library, it is possible to decrypt the ciphertext

using **PrinceCharming** ​ as the key.


There is a **key** ​ file that can be found on the FTP server. Using the above credentials, it is possible

to SSH in.


Page 6 / 7



​ ​

​


​


​


​ ​ ​


​


## **Privilege Escalation**

Exploit: [https://www.defensecode.com/public/DefenseCode_Unix_WildCards_Gone_Wild.txt​](https://www.defensecode.com/public/DefenseCode_Unix_WildCards_Gone_Wild.txt)


Depending on the escalation enumeration script used, the correct attack vector may be fairly

challenging to locate.


The **/usr/src** ​ folder is writeable for the **sec** ​ user and contains a **thoughts.txt** ​ file owned by root.

Attempting to create a file will reveal (after a bit of a delay) that there is a scheduled task which

runs **chown *** ​ in the directory. Using the above exploit, it is possible to force chown to use a

reference file and apply the owner:group of that file to everything in the directory. The command

**touch -- --reference=thoughts.txt** will create a file, with the name being passed as an argument

to chown when it runs.


After that is configured, it is possible to create a binary and set its SUID bit. After the task runs

and chowns the binary, it is possible to execute code as root.


Page 7 / 7



​


​ ​ ​


​



​


​ ​ ​


​


