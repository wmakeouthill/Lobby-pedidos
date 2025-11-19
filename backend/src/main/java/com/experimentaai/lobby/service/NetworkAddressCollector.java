package com.experimentaai.lobby.service;

import com.experimentaai.lobby.exception.NetworkAddressException;
import com.experimentaai.lobby.exception.ServerInfoException;
import com.experimentaai.lobby.ui.NetworkAddress;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;

@Service
public class NetworkAddressCollector {

    private static final String LOCALHOST = "localhost";
    private static final String HTTP_PREFIX = "http://";

    @Value("${server.port:80}")
    private int serverPort;

    public List<NetworkAddress> collect() {
        List<NetworkAddress> addresses = new ArrayList<>();
        
        try {
            InetAddress localHost = InetAddress.getLocalHost();
            String hostname = localHost.getHostName();
            String hostAddress = localHost.getHostAddress();
            String canonicalHostname = localHost.getCanonicalHostName();

            String portSuffix = formatPort();
            
            addresses.add(new NetworkAddress("Localhost", LOCALHOST, 
                buildUrl(LOCALHOST, portSuffix)));
            addresses.add(new NetworkAddress("IP da Máquina", hostAddress, 
                buildUrl(hostAddress, portSuffix)));
            
            if (!hostname.equals(LOCALHOST) && !hostname.equals(hostAddress)) {
                addresses.add(new NetworkAddress("Hostname", hostname, 
                    buildUrl(hostname, portSuffix)));
            }

            addresses.add(new NetworkAddress("DNS Configurado", "fila.experimentaai", 
                buildUrl("fila.experimentaai", portSuffix)));

            if (isValidCanonicalHostname(canonicalHostname, hostname, hostAddress)) {
                addresses.add(new NetworkAddress("Hostname Canônico", canonicalHostname, 
                    buildUrl(canonicalHostname, portSuffix)));
            }

        } catch (UnknownHostException e) {
            throw new NetworkAddressException("Failed to collect network addresses", e);
        }
        
        return addresses;
    }

    public ServerInfo getServerInfo() {
        try {
            InetAddress localHost = InetAddress.getLocalHost();
            return new ServerInfo(
                localHost.getHostName(),
                localHost.getHostAddress(),
                serverPort
            );
        } catch (UnknownHostException e) {
            throw new ServerInfoException("Failed to get server info", e);
        }
    }

    private String formatPort() {
        return serverPort == 80 ? "" : ":" + serverPort;
    }

    private String buildUrl(String host, String portSuffix) {
        return HTTP_PREFIX + host + portSuffix;
    }

    private boolean isValidCanonicalHostname(String canonical, String hostname, String hostAddress) {
        return !canonical.equals(hostname) 
            && !canonical.equals(hostAddress) 
            && !canonical.equals(LOCALHOST);
    }

    public static class ServerInfo {
        private final String hostname;
        private final String ipAddress;
        private final int port;

        public ServerInfo(String hostname, String ipAddress, int port) {
            this.hostname = hostname;
            this.ipAddress = ipAddress;
            this.port = port;
        }

        public String getHostname() {
            return hostname;
        }

        public String getIpAddress() {
            return ipAddress;
        }

        public int getPort() {
            return port;
        }
    }
}

