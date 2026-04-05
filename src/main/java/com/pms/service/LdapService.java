package com.pms.service;

import com.pms.config.LdapConfig;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.naming.Context;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import javax.naming.NamingEnumeration;
import javax.naming.directory.SearchControls;
import javax.naming.directory.SearchResult;
import java.util.Hashtable;

@Service
public class LdapService {

    @Autowired
    private LdapConfig ldapConfig;

    public boolean authenticate(String username, String password) {
        if (password == null || password.isBlank()) return false;
        if (ldapConfig.getLdaps() == null || ldapConfig.getLdaps().isEmpty()) {
            return false;
        }

        for (LdapConfig.LdapServerInfo server : ldapConfig.getLdaps()) {
            for (String base : server.getBases()) {
                if (tryAuthenticateBySearch(server, base, username, password)) {
                    return true;
                }
            }
        }
        return false;
    }

    private boolean tryAuthenticateBySearch(LdapConfig.LdapServerInfo server, String base, String user, String pass) {
        Hashtable<String, String> env = new Hashtable<>();
        env.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
        env.put(Context.PROVIDER_URL, server.getUrl());
        env.put(Context.SECURITY_AUTHENTICATION, "simple");
        
        // 1. 先用管理員帳號登入 (Admin Bind)
        env.put(Context.SECURITY_PRINCIPAL, server.getUsername());
        env.put(Context.SECURITY_CREDENTIALS, server.getPassword());

        try {
            DirContext adminCtx = new InitialDirContext(env);
            
            // 2. 搜尋該使用者的真實 DN
            SearchControls sc = new SearchControls();
            sc.setSearchScope(SearchControls.SUBTREE_SCOPE);
            
            // 同時搜尋 sAMAccountName (純帳號) 與 userPrincipalName (Email型)
            String filter = "(|(sAMAccountName=" + user + ")(userPrincipalName=" + user + "))";
            NamingEnumeration<SearchResult> results = adminCtx.search(base, filter, sc);
            
            String userDn = null;
            if (results.hasMore()) {
                SearchResult sr = results.next();
                userDn = sr.getNameInNamespace();
            }
            adminCtx.close();

            if (userDn == null) {
                System.out.println("LDAP: User not found in base: " + base);
                return false;
            }

            // 3. 使用找到的 DN 與使用者密碼進行驗證 (User Bind)
            Hashtable<String, String> userEnv = new Hashtable<>();
            userEnv.put(Context.INITIAL_CONTEXT_FACTORY, "com.sun.jndi.ldap.LdapCtxFactory");
            userEnv.put(Context.PROVIDER_URL, server.getUrl());
            userEnv.put(Context.SECURITY_AUTHENTICATION, "simple");
            userEnv.put(Context.SECURITY_PRINCIPAL, userDn);
            userEnv.put(Context.SECURITY_CREDENTIALS, pass);
            
            try {
                DirContext userCtx = new InitialDirContext(userEnv);
                userCtx.close();
                System.out.println("LDAP Auth SUCCESS for: " + userDn);
                return true;
            } catch (Exception e) {
                System.out.println("LDAP Auth FAIL (Pass wrong) for: " + userDn + " - " + e.getMessage());
            }

        } catch (Exception e) {
            System.err.println("LDAP Admin connect error for " + server.getUrl() + ": " + e.getMessage());
        }
        return false;
    }
}
