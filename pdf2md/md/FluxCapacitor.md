# FluxCapacitor

*Converted from: FluxCapacitor.pdf*

---

# FluxCapacitor

11 [th] May 2018 / Document No

D18.100.04


Prepared By: Alexander Reid (Arrexel)


Machine Author: del_EzjAx34h


Difficulty: Medium


Classification: Official

## **Synopsis**


FluxCapacitor focuses on intermediate/advanced enumeration of web applications as well as

bypassing web application firewall rules. Overall, FluxCapacitor is not overly challenging and

provides a good learning experience for fuzzing HTTP parameters.
### **Skills Required**


Intermediate knowledge of Linux


Knowledge of basic web fuzzing techniques
### **Skills Learned**


Enumerating HTTP parameters


Bypassing basic WAF rules


Exploiting NOPASSWD


## **Enumeration**
### **Nmap**

Nmap reveals only a single open port, which appears to be some type of web application firewall

according to the version details.
### **Dirbuster**


The `Dirbuster` reveals several results, all starting with `/sync.` Some manual testing shows that

`/sync` followed by any other text will always yield the same result. Attempting to view the site in

Firefox presents a 403 forbidden error, which reveals that the server is running `OpenResty`

```
1.13.6.1.
## **Exploitation**
```

Attempting to curl the `/sync` endpoint will result in a timestamp being returned. A bit of testing

reveals that any user-agent containing “Mozilla” will return a 403 error.


Wordlist: https://github.com/danielmiessler/SecLists/blob/master/Discovery/Web-Content/burp
parameter-names.txt


Using the above wordlist, it is possible to fuzz and find a parameter name for the /sync endpoint.

With wfuzz, the syntax is

The parameter opt is the only result with a 403 error. We can add a `Burpsuite` proxy to our curl

command to examine the request more clearly.


Very basic tests quickly reveal that the `opt` parameter is vulnerable to command injection.


There is a fairly simple filter which seems to return a 403 for strings longer than 2 characters. To

bypass this, the escape character \ can be used to break up strings. For example, `w\h\o\a\m\i` will

bypass the filter and execute successfully.


The pattern `/-/` (with anything in between) also appears to be caught by the filter. By serving a

bash script as `index.html,` the use of a slash in `wget` / `curl` can be avoided and the command

execution can be leveraged to obtain a reverse shell.


The bash script can be easily executed through this `GET` request.

Checking our listener we get a shell on the system as `nobody` .

## **Privilege Escalation**


Escalating privileges is fairly straightforward. Simply running `sudo -l` exposes a `NOPASSWD` script


Reviewing the script, it appears that the first argument must be cmd, followed by a second

argument which is a Base64-encoded command that will be executed. For example, running the

command sudo /home/themiddle/.monit cmd d2hvYW1p will execute whoami and output root.


