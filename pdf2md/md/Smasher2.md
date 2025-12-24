# Smasher2

*Converted from: Smasher2.pdf*

---

# Smasher2
## **29 [th] October 2019 / Document No D19.100.41**

**Prepared By: MinatoTW**

**Machine Author: dzonerzy & xG0**

**Difficulty: Insane**

**Classification: Official**


Page 1 / 29


## **Synopsis**

Smasher2 is an insane difficult linux machine, which requires knowledge of Python, C and kernel

exploitation. A folder protected by Basic Authentication is brute-forced to gain source code for a

session manager on one of the vhosts. A shared object file is used by the session manager which

has a vulnerable function leading to credential leakage. Then a kernel module is found which

uses a weak mmap handler and is exploited to gain a root shell.


## **Skills Required**


  - Source code review

  - Linux enumeration

  - Kernel exploitation

  - Reverse engineering


## **Skills Learned**


  - Exploiting mmap handlers

  - Reversing shared objects



Page 2 / 29


## **Enumeration** **Nmap**





We have SSH open on 22, DNS on 53 and Apache running on port 80.

## **DNS**


A DNS server can be used to gain information about sub-domains and vhosts. As we don’t have a

vhost yet, let's try to do a reverse lookup using dig.


Page 3 / 29


This will try to find any records for the IP address we specified.


We see that there are no such records. Let’s try to do a zone transfer now. We can use

smasher2.htb as a vhost based upon the box name.





Page 4 / 29


​ ​



​ ​



We see that it worked and now we have two new vhosts, i.e. wonderfulsessionmanager.htb and
root.smasher2.htb. We can proceed to add these to /etc/hosts.

## **Apache**


Browsing to [http://smasher2.htb​](http://smasher2.htb/) we see a default Apache installation for Ubuntu. ​

## Gobuster


Let’s run gobuster to find files and folders on the server. We’ll add the status code 401 to find

pages protected by basic authentication.



​ ​



​ ​



​ ​



​ ​


Page 5 / 29


We find a folder named backup which contains the following files.


We find two files auth.py and ses.so. Let’s download both of them.





Let’s save these files for later and proceed to examine the other vhost i.e.
wonderfulsessionmanager.htb. Browsing to the page, we see a session manager website.


There’s a login page which asks for a password.


Page 6 / 29


Let’s try sending a request and intercept it in burp.


Looking at the response we find that the backend server is a python Werkzeug / Flask server. We

also have a python script which was found in the backup folder. Let’s examine it to see if it’s the

source code for this server.


Page 7 / 29


## **Source Code Review and Reverse Engineering**

Looking at the imports in auth.py, we see that it imports ses which is the shared object we found

and flask, which is the server.





Then the methods are declared at the beginning:













Page 8 / 29


Looking at the safe_init_manager method, we see that it accepts an ​ **id** parameter and checks if

exists in the Managers dict declared earlier. If it doesn’t already exist, the dict is updated with the

key id and it’s value as the ses.SessionManager object. This takes a list of the form [ ‘username’,

‘password’] and a secure token. The craft_secure_token method is used to create the secure

token, which is a SHA256 digest of the string username + password. The log_creds method logs

a credential pair into creds.log. The secret key is a random 32-byte string, so we won’t be able to

brute force it.


Scrolling down, we see a definition for the /auth route which is used to login.







Page 9 / 29


First the manager variable is initialized with a ses.SessionManager object using the id. Then the

data variable is used to store the requested JSON. If it’s not null, then tmp_login is used to store

the requested credentials. Then manager.check_login is used to check if the login is valid, which

returns an array. An array named secret_token_info is created with details about the API key. If

islogged[0] is not true, the authentication fails and the message is returned. The manager.block

attribute decides whether the user is blocked or not. If the login is successful, then it goes ahead

and logs the creds using the log_creds method, and also returns the API key and endpoint to


Page 10 / 29


​



access.


Looking at the endpoint route:


​



​



​



​



We see that it accepts JSON via a POST request, and uses the schedule value to execute the

subprocess.check_output method. As there is no sanitization in place, this is vulnerable to

command injection. Let’s reverse the ses.so file to examine the method definitions. You can use

your preferred decompiler / disassembler to reverse engineer the shared object. A trial version of

[Hopper​](https://www.hopperapp.com/download.html) will also suffice.


Looking at the SessionManager_init method we see the object initialization:


Page 11 / 29


The object consists of user_login (a list), and secret_key (secure token). We saw this previously in

the safe_init_manager method, where the login list and craft_secure_token method were used.

Looking further, we see the object consisting of a few internal attributes i.e. the integers

login_count, last_login, and blocked. The time_module might be used to represent the time of

the login attempt. Next, let’s look at the check_login method, which we saw in the login() method.


Right at the top we see that it checks if the passed argument is a dict or not. If it’s a dict then it


Page 12 / 29


checks if the parameter “data” is present in the dict or not.


If there’s a data parameter in the input object, the code then checks if the user is blocked from

logging in or not.


The is_blocked() method checks if the “blocked” attribute in the object is set or not. If the method

returns 1, the login fails. If the user isn’t blocked, the get_login_count() method is called, which

returns the number of login attempts by the user. If the count is greater than 9, then the code

jumps to loc_23eb.


Page 13 / 29


After jumping to loc_23eb, the set_blocked() method is called to prevent future login attempts by

the user within a period of time. The user object i.e. var_68 is never used by code after this point.

This is where the concept of “Reference Counting” comes in.

## Reference Counting


Unlike C and C++, python automatically creates and frees objects on the heap. In order to keep

track of the usage of an object, python counts the number of references to it. In simple terms, a

reference is a pointer to the object in memory. The getrefcount function in the sys module returns

the number of references to an object. For example:





The code initializes the variable “a” with a list containing the string ‘HTB rockz!!’. This is allocated


Page 14 / 29


by python on the heap, and now a reference is given to “a” pointing to the list. Then the

reference count for “a” is printed. Next, another variable “b” is initialized with “a”. This will pass

the reference of the string to “b”. After which the reference count is printed again.


As we can see, the reference count for “a” is equal to two, as it is referenced by the function as

well as the variable creation. The reference count is incremented to three after the variable “b”

gets initialized. But once the variable gets deleted, the reference count is decremented. Add the

following lines to the script and run the code again.





As discussed, the reference count for “a” goes back to 2 due to dereferencing of the object after

deletion of “b”. When the reference count for a particular object falls to 0, the garbage collector

automatically deallocates it from the heap.


Page 15 / 29


​ ​ ​ ​


## Exploitation

Now that we know about Reference Counting, we can go ahead and try exploiting the server.

Going back to the python code, it’s seen that the secret_token_info list is initialized right after the

check_login method is called.


​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​



The secret_token_info is present right next to the “data” object on the heap and is shifted to the

top once the reference count for “data” drops to 0.


This means that we can leak the secret_token object at the 11th login attempt by sending a

crafted object in the request, such as:


​ ​ ​ ​



​ ​ ​ ​



​ ​ ​ ​



Where **`["","",0]`** ​ is the format​ ​ for secret_token_info. ​


The image shows the leaked API token after sending 10 failed login attempts.



​ ​ ​ ​



​ ​ ​ ​


Page 16 / 29


## Alternate Method

Going back to the check_login method we see the strcmp calls, which use the get_internal_usr()

and get_internal_pwd() calls.


Looking at the definition of both the methods:


We see that the methods are one and the same. They both take in the object and read the first

element from it, i.e. the username, which can be concluded from PyList_GetItem(var_10, 0x0).


Page 17 / 29


So the check_login methods compare the request username and password to ​ _just the internal_

_username_ and not the password. This means that we can bypass the login if we’re able to guess

the correct username.


Trying a few usernames we find that “Administrator” let’s us in. It is worth noting that C is case

sensitive, hence administrator is not the same as Administrator.


The API key is returned, which can be used to execute commands.


Page 18 / 29


## **Foothold**

As we saw earlier that the schedule parameter is vulnerable to command injection. Let’s try

injecting some commands.


We see output of the command “whoami”. But other commands such as ls, curl, or wget return a

403 error. This could mean that there’s a WAF in place.


In bash there’s a feature known as string concatenation, for example:


Page 19 / 29


​



All the characters or strings within the quotes are concatenated to form a single string and then

the command gets executed. We can abuse this in order to bypass the WAF. This is because the

WAF sees the obfuscated command but not the final command line. The only precaution we

need to take is that the number of quotes should be even. Let’s try that.


As we see, **l** ​ **`'`** **s** **`'`** was able to bypass the WAF and execute. Now, in order to get a shell we can use

a bash one-liner encoded as base64.



​



​



​



​


After which our command would look like:



​



​



​


And to bypass the WAF we can use:



​



​



​


Page 20 / 29


We can now use ssh-keygen to create SSH keys for dzonery on the box and then copy the id_rsa

key locally to login via SSH.


Page 21 / 29


Page 22 / 29


## **Privilege Escalation** **Enumeration**

Looking at the groups of the user we see that he’s in the adm group.


This gives us read access to the system and kernel logs. While looking at the /var/log/kern.log we

see an odd kernel module named DHID being loaded.





This can be seen using the command lsmod.



Page 23 / 29


The module can be found using the “locate” command.


Let’s transfer this locally using scp to investigate further.


We can use Hopper once again to reverse this driver. Looking at the dev_open() method we see

that device opening information is printed.


Going back to the box and looking at /dev/dhid we see a world writable device.


Page 24 / 29


​ ​



​ ​



This can be used to allocate memory using the [mmap()​](http://man7.org/linux/man-pages/man2/mmap.2.html) ​ call. According to the man page:


The arguments are the address to start from, the total length and other flags.


Looking at the dev_mmap() which is the mmap handler for the module, we see it accepts the user

arguments without any checks or sanitization.


Page 25 / 29



​ ​



​ ​


​ ​



The register r12 is used to store the vma_size, and rbx is the offset which can be noticed in the

print format. We see it checks if the vma_size is greater than 0x10000 and if the offset is greater

[than 0x1000. If this is true then the mmap fails, else it calls remap_pfn_range()​](https://www.kernel.org/doc/htmldocs/kernel-api/API-remap-pfn-range.html),​ as denoted by

loc_b3c:


This function is used to remap kernel memory to userspace. As the vma_size is a signed integer

we can overflow it with a negative value such as 0xf000000 which will include the whole

memory along with the kernel space from where we can search for the credential structure.


Here’s an excellent paper by MWR labs describing this vulnerability and exploitation:

[https://labs.mwrinfosecurity.com/assets/BlogFiles/mwri-mmap-exploitation-whitepaper-2017-09-18](https://labs.mwrinfosecurity.com/assets/BlogFiles/mwri-mmap-exploitation-whitepaper-2017-09-18.pdf)

[.pdf](https://labs.mwrinfosecurity.com/assets/BlogFiles/mwri-mmap-exploitation-whitepaper-2017-09-18.pdf)


Here’s the PoC for the exploitation.


Page 26 / 29



​ ​



​ ​


Page 27 / 29


It opens the device /dev/dhid then uses mmap to map from the address 0x42424000 and the

offset 0xf000000. Once successful, it starts to search for our credential structure, i.e. with

UID=1000. Once found, it replaces them with UID=0 to make us root and then executes /bin/sh.


Page 28 / 29


​ ​



More information on the cred structure can be found [here​](https://www.kernel.org/doc/Documentation/security/credentials.txt) .​


Compile the exploit using gcc and transfer it using scp.


Once transferred, make it executable and execute the exploit.


After which we should have a root shell.



​ ​



​ ​



​ ​


Page 29 / 29


