# Valentine

*Converted from: Valentine.pdf*

---

# Valentine
## **28 [th] July 2018 / Document No D18.100.13**

**Prepared By: Alexander Reid (Arrexel)**

**Machine Author: mrb3n**

**Difficulty: Medium**

**Classification: Official**



Page 1 / 8


## **SYNOPSIS**

Valentine is a very unique medium difficulty machine which focuses on the Heartbleed

vulnerability, which had devastating impact on systems across the globe.


## **Skills Required**


  - Beginner/Intermediate knowledge of

Linux


## **Skills Learned**


  - Identifying servers vulnerable to

Heartbleed

  - Exploiting Heartbleed

  - Exploiting permissive tmux sessions


Page 2 / 8


## **Enumeration** **Nmap**

Nmap reveals OpenSSH and Apache running both HTTP and HTTPS.



Page 3 / 8


## **Dirbuster**

Dirbuster finds a **hype_key** file as well as **encode** and **decode** directories.



Page 4 / 8


## **Heartbleed**

Running nmap again with the Heartbleed enumeration script confirms that the server is indeed

vulnerable to Heartbleed, as hinted at by the machine name.





Page 5 / 8


## **Exploitation** **Heartbleed**

Exploit: [https://github.com/sensepost/heartbleed-poc](https://github.com/sensepost/heartbleed-poc)


Using the above exploit, it is fairly straightforward to obtain some sensitive information from

memory. Running it several times should yield a base64-encoded string.





Decoding the base64 reveals the passphrase for **hype_key** .



Page 6 / 8


This passkey can can be used to connect via SSH as the **hype** user.


_**Note**_ - _The SSH-RSA algorithm has been fully disabled by default on the newer versions of_

_OpenSSH. Thus, it might be required to explicitly specify the algorithm in the command itself._




## **Privilege Escalation** **tmux**

Running **ps aux** reveals a tmux session being run as the root user.


Simply running the command **tmux -S /.devs/dev_sess** will connect to the session, with full root

privileges.


Page 7 / 8


Page 8 / 8


