# Mirai

*Converted from: Mirai.pdf*

---

# Mirai
## **3 [rd] October 2017 / Document No D17.100.02**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: Arrexel**

**Difficulty: Easy**

**Classification: Official**


Page 1 / 8


## **SYNOPSIS**

Mirai demonstrates one of the fastest-growing attack vectors in modern times; improperly

configured IoT devices. This attack vector is constantly on the rise as more and more IoT devices

are being created and deployed around the globe, and is actively being exploited by a wide

variety of botnets. Internal IoT devices are also being used for long-term persistence by malicious

actors.


## **Skills Required**


  - Intermediate knowledge of Linux

  - Enumerating ports and services

  - Basic knowledge of the Mirai botnet


## **Skills Learned**


  - Identifying an IoT device

  - Forensic file recovery



Page 2 / 8


## **Enumeration** **Nmap**

Nmap reveals several open services: OpenSSH, a DNS server, a lighttpd server, and a Plex media

server with accompanying UPnP servers. When attempting to view the website in a browser, a

blank page is presented.


Page 3 / 8


​


## **Dirbuster**

Fuzzing with Dirbuster (Dirbuster lowercase medium wordlist) reveals a few interesting

directories.


Upon browsing to the **/admin** ​ page, a Pi-hole admin dashboard is presented. From here, it is safe

to assume that the target is a Raspberry Pi machine, and is most likely running Raspbian.


Page 4 / 8



​



​


​


​


​


## **Exploitation**

Knowing the target operating system and device, while keeping in mind how the Mirai botnet

operates, it can be assumed that the default user credentials have been unchanged. A quick

search reveals that the default Raspbian credentials are **pi:raspberry** ​ . Connecting via SSH with

these credentials immediately gives full access to the device, as the default configuration for

Raspbian has the **pi** ​ user as part of the sudoers group.


From here the user flag can be obtained from **/home/pi/Desktop/user.txt** ​ . Upon closer

inspection, the root flag is not in its typical location. Instead, the root.txt files presents the

message “I lost my original root.txt! I think I may have a backup on my USB stick…”


Page 5 / 8



​


​


​


​

​


​ ​


## **Privilege Escalation**

While this machine does not require any exploitation to obtain root permissions, the flag must be

obtained through alternate methods. Based on the hint in the root.txt file, it can be assumed that

there is a mounted drive or partition that contains a copy of the original file. Running **df -h** ​ outputs

a list of the machine’s partitions, the last of which being mounted on **/media/usbstick** ​ .


Browsing to **/media/usbstick** ​, there is a single file, **damnit.txt** ​ . The contents are:


_Damnit! Sorry man I accidentally deleted your files off the USB stick._


_Do you know if there is any way to get them back?_


_-James_


Judging by the contents of the note, the deleted flag must be recovered. A quick check in

**lost+found** gives no results, so other methods must be used.


Page 6 / 8



​

​


​ ​


​ ​


## **Method 1 - Strings**

While not the intended method, **strings** ​ will immediately reveal the flag if run on **/dev/sdb** ​ .


Page 7 / 8



​ ​


​

​


​


​


​


## **Method 2 - Imaging and Recovery**

​

​


​


​


​



The command **sudo dcfldd if=/dev/sdb of=/home/pi/usb.dd** ​ will create an image of the USB stick

and save it to the **pi** ​ user’s home directory. From there, the file can be exfiltrated many ways. In

this case, a simple SCP from the attacking machine will suffice. The following command copies

usb.dd to the local machine’s working directory: **scp pi@10.10.10.48:/home/pi/usb.dd .** ​


With the USB image at hand, it is possible to run a large range of tools against it to extract the

data. Unfortunately, in this case, the data between the filename and the contents of the file itself

has been overwritten, so recovery with most tools is not possible. A quick check with **testdisk** ​

shows the file with a size of 0.


Knowing that the file did exist at one point, it is safe to assume the data may still be in the image.

Opening it with any text or hex editor will reveal the flag, as will running **strings** ​ against the

image.


Page 8 / 8



​

​


​


​


​


