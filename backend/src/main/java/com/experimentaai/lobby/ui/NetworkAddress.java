package com.experimentaai.lobby.ui;

public class NetworkAddress {
    private final String type;
    private final String dns;
    private final String url;

    public NetworkAddress(String type, String dns, String url) {
        this.type = type;
        this.dns = dns;
        this.url = url;
    }

    public String getType() {
        return type;
    }

    public String getDns() {
        return dns;
    }

    public String getUrl() {
        return url;
    }
}

