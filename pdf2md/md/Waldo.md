# Waldo

*Converted from: Waldo.pdf*

---

# Waldo
## **12 [th] December 2018 / Document No D18.100.31**

**Prepared By: egre55**

**Machine Author: strawman & capnspacehook**

**Difficulty: Medium**

**Classification: Official**


Page 1 / 15


## **SYNOPSIS**

Waldo is a medium difficulty machine, which highlights the risk of insufficient input validation,

provides the challenge of rbash escape or bypassing, and showcases an interesting privilege

escalation vector involving Linux Capabilities, all of which may be found in real environments.


## **Skills Required**


  - Basic Web Application enumeration

skills

  - Basic Linux enumeration skills


## **Skills Learned**


  - Source code review

  - Rbash escape techniques

  - Linux Capabilities enumeration


Page 2 / 15


## **Enumeration** **Nmap**






Page 3 / 15


## **Burp Suite**

It’s worth examining it in a proxy for further inspection. This shows that the "dirRead.php" page is

requested, with the "path" parameter set to "/.list/". A directory listing is returned in JSON format.


After tampering with the "path" parameter and removing ./list, a listing of the top-level directory is

returned. This reveals various interesting files that seem to offer additional file read, write and

delete functionality.


The source code of the PHP files can now be viewed.


Page 4 / 15


## Source Code Review

The source code of fileRead.php is returned, but it contains escape characters and newlines and

tabs have been represented by the JSON parser as "\n" and "\t". The sed Stream EDitor utility can

be used to tidy up the formatting.













Page 5 / 15


The developer has used the "str_replace" function in an attempted sanitization of user input, to

prevent directory traversal:





This will delete "../" or ".." from the user provided file path. However, if "....//" is provided as input,

even after removing "../" – the remaining "../" still allows for directory traversal. This is confirmed,

and the filesystem can now be enumerated.

## Local File Enumeration


/etc/passwd can be accessed, and after fixing the formatting, it seems several users have a login

shell.


Page 6 / 15


The nobody user is listed and their home directory is accessible. Further enumeration of this

folder reveals an SSH private key called ".monitor”.


Page 7 / 15


## **Foothold**

After fixing the formatting of the private key, an SSH session is opened on Waldo as "nobody",

and user.txt is gained.





Page 8 / 15


## **Post Exploitation** **Situational Awareness**

Alpine is a lightweight Linux distribution that is commonly used with containerization software

such as Docker. The commands below can confirm whether the current shell is situated within a

Docker container.





The cgroup (control groups) file is concerned with process resource utilization. A

non-containerized control groups file is listed below as reference.


The ".dockerenv" file contains the environment variables defined for use inside the container. It is

confirmed that the current session is situated within a Docker container.


Page 9 / 15


​ ​

​

​



The netstat command reveals that the host is listening on port 8888.


​ ​

​

​



​ ​

​

​



More network connection information can be gained from parsing the /proc/net/tcp​ and​

​

​



​ ​

/proc/net/tcp files. In his post "netstat without netstat", Etienne Stalmans (@_staaldraad) ​

​



​ ​

​

demonstrates how this is possible (see **Appendix A** ​ ). The output of the "netstat" awk function



​ ​

​

​

reveals further open ports, and it seems that the container has been configured to share the



​ ​

​

​


host’s localhost.


Inspection of the SSH config file reveals that port 8888 is referenced. It seems possible that

SSHing from the container will connect to the host on port 8888.


Page 10 / 15



​ ​

​

​



​ ​

​

​


## **Lateral Movement**

Remembering the ".monitor" private SSH key, the command below is issued and a shell is gained

as monitor.





Page 11 / 15


## **Rbash Escape**

The error "-rbash: id: command not found" reveals that the shell is restricted.


The PATH is missing several entries and it is not possible to specify absolute paths. As the

gnu.org article below on "The Restricted Shell" states, it is not possible to set the PATH variable

in rbash.


[https://www.gnu.org/software/bash/manual/html_node/The-Restricted-Shell.html](https://www.gnu.org/software/bash/manual/html_node/The-Restricted-Shell.html)


Fortunately, the SSH "-t" switch allows a tty to be forced for the login, which will bypass rbash.

After exiting the current restricted shell, the command below is executed.





An unrestricted albeit unprivileged shell is gained, and the PATH environment variable is set, to

allow for easy command execution.





Page 12 / 15


## **Privilege Escalation** Exploiting Linux Capabilities

Enumeration of the home directory reveals various binaries and "logMonitor-0.1" seems

interesting as it might have been conferred privileges in order to read log files. However, the

SETUID bit has not been set.


A less well-known technique of allowing binaries to run with elevated privileges are Linux

Capabilities. The Post "Linux Capabilities - A friend and foe" by m0noc provides a good overview

of this subject.


[https://blog.m0noc.com/2016/05/linux-capabilities-friend-and-foe.html](https://blog.m0noc.com/2016/05/linux-capabilities-friend-and-foe.html)


A check for assigned capabilities can be performed with the getcap utility.


This reveals that both logMonitor-0.1 and /usr/bin/tac utilities have been assigned the capability

"cap_dac_read_search+ei", which allow permissions checks when reading from or searching

directories to be bypassed.


[https://www.insecure.ws/linux/getcap_setcap.html](https://www.insecure.ws/linux/getcap_setcap.html)


Page 13 / 15


The tac utility functions the same as cat, but the output order is reversed. The root SSH key can

be read by specifying a separator that isn’t contained within the file, such as "@" - which treats the

content as a single line and maintains the output order:





Or the reversed output can be provided again as input, also restoring the original order:





However, in this instance there is no authorized_keys file for root, and so SSH access using the
gained private key is not possible. Instead, the root.txt file can be printed.





Page 14 / 15


## **Appendix A**





_Etienne Stalmans’ “netstat” awk function_
[https://staaldraad.github.io/2017/12/20/netstat-without-netstat/](https://staaldraad.github.io/2017/12/20/netstat-without-netstat/)


Page 15 / 15


