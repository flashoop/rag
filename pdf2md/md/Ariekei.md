# Ariekei

*Converted from: Ariekei.pdf*

---

# Ariekei
## **8 [th] March 2018 / Document No D18.100.01**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: rotarydrone**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 10


## **SYNOPSIS**

Ariekei is a complex machine focusing mainly on web application firewalls and pivoting

techniques. This machine is by far one of the most challenging, requiring multiple escalations and

container breakouts.


## **Skills Required**


  - Advanced knowledge of Linux

  - Understanding of pivot techniques and

tunneling


## **Skills Learned**


  - Identifying containers

  - Enumerating remote networks

  - Advanced pivoting and tunneling

techniques

  - Web application firewall evasion


Page 2 / 10


## **Enumeration** **Nmap**

Nmap reveals an nginx server and two OpenSSH servers running different versions, which

indicates there is likely some kind of container or virtual environment running on the system.


Page 3 / 10


​

​


## **SSLyze**

Running SSLyze with the command **sslyze --regular 10.10.10.65** ​ reveals the subdomains

**calvin.ariekei.htb** and **beehive.ariekei.htb** ​ .


Page 4 / 10



​

​


​ ​

​ ​ ​



**Dirbuster**


Fuzzing the **calvin.ariekei.htb** ​ subdomain reveals an **/upload** ​ script. It is not shown in the above

image, however there is also a **/cgi-bin/stats** ​ file which exposes **Bash** ​ version **4.2.37(1)** ​ which is

vulnerable to shellshock. Attempting to exploit shellshock will result in failure as it is blocked by

the WAF.


Page 5 / 10



​ ​

​ ​ ​


​

​


## **Exploitation** **ImageTragick**

Exploit: [https://imagetragick.com​](https://imagetragick.com/)


Using the ImageTragick exploit (CVE-2016-3714) is trivial. Uploading an **.mvg** ​ file with the

following content will grant a shell as the first root user.


As root access is gained immediately, and many default binaries are missing from the machine, it

can be assumed that the connection is restricted to a container of some kind.


Page 6 / 10



​

​


​


## **Privilege Escalation** **Ezra/Bastion**

With the private key in hand, it is possible to connect via SSH on port 1022, which lands in

another container similar to the previous one. Overall the container is quite similar to calvin,

however it is possible to connect to the container hosting the public web server while bypassing

the firewall. A tunnel can be opened over SSH using the command **ssh -i bastion.key 10.10.10.65** ​

**-p 1022 -L <LOCALPORT>:172.24.0.2:80**


After the tunnel is created, it is possible to curl localhost and the request will be forwarded to the

target.


Page 7 / 10



​


​


​


​

​ ​ ​


## **Beehive**

With the tunnel open, it is possible to exploit the Shellshock vulnerability discovered during

enumeration. After opening a second SSH connection normally, the command **nc -nvlp 1234** ​ will

start a listener on Ezra/Bastian to catch the reverse connection.


Viewing the contents of **/common/containers/blog-test/Dockerfile** ​ exposes a root password,

and it is possible to escalate to root after spawning an interactive shell with python. The

​

​ ​ ​



​


​


​

​ ​ ​



​


​


command **python -c ‘import pty; pty.spawn(“/bin/bash”)’** ​ followed by CTRL-Z and the

​ ​ ​



​


​


​

commands **stty raw -echo** ​ and **fg** ​ will spawn an interactive shell and allow use of the **su** ​



​


​


​

​ ​ ​

command.



​


​


​

​ ​ ​


Page 8 / 10


​

​ ​

​


## **spanishdancer**

​

​ ​

​



The user flag and an SSH key can be obtained from **/home/spanishdancer** ​, however there is a

​ ​

​



​

passphrase on the SSH key. Converting the key with **ssh2john id_rsa** ​ **> spanishdancer.john** ​ and

​



​

​ ​

then running John with **john spanishdancer.john** ​ will immediately crack the passphrase.



​

​ ​

​



​

​ ​

​


It is possible to connect to the main host (SSH to port 22) with the obtained key.



​

​ ​

​



​

​ ​

​


Page 9 / 10


​

​ ​

​

​

​


## **Root**

Exploit: [https://fosterelli.co/privilege-escalation-via-docker.html​](https://fosterelli.co/privilege-escalation-via-docker.html)


​ ​

​

​

​



​


The final escalation is fairly straightforward. As the **spanishdancer** ​ user is part of the **Docker** ​

​

​

​



​

​ ​

group, it is possible to spawn a bash container with root privileges. The command **docker run -it** ​

​

​



​

​ ​

​

**-v /:/opt bash bash** will create the container and mount the filesystem to the **/opt** ​ directory. The

​



​

​ ​

​

​

root flag can be obtained from **/opt/root/root.txt** ​



​

​ ​

​

​

​



​

​ ​

​

​

​


Page 10 / 10


