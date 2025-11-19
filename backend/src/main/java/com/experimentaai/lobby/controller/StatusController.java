package com.experimentaai.lobby.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class StatusController {

    private static final String LOCALHOST = "localhost";
    private static final String HTTP_PREFIX = "http://";

    @Value("${server.port:80}")
    private int serverPort;

    @GetMapping(value = {"/status"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> getStatus() {
        try {
            InetAddress localHost = InetAddress.getLocalHost();
            String hostname = localHost.getHostName();
            String hostAddress = localHost.getHostAddress();
            String canonicalHostname = localHost.getCanonicalHostName();

            // Porta formatada (sem porta se for 80)
            String portaFormato = (serverPort == 80) ? "" : ":" + serverPort;

            List<Map<String, String>> enderecos = new ArrayList<>();
            
            // Localhost
            enderecos.add(Map.of(
                "tipo", "Localhost",
                "url", HTTP_PREFIX + LOCALHOST + portaFormato,
                "dns", LOCALHOST
            ));
            
            // IP da máquina
            enderecos.add(Map.of(
                "tipo", "IP da Máquina",
                "url", HTTP_PREFIX + hostAddress + portaFormato,
                "dns", hostAddress
            ));
            
            // Hostname
            if (!hostname.equals(LOCALHOST) && !hostname.equals(hostAddress)) {
                enderecos.add(Map.of(
                    "tipo", "Hostname",
                    "url", HTTP_PREFIX + hostname + portaFormato,
                    "dns", hostname
                ));
            }
            
            // DNS fila.experimentaai
            enderecos.add(Map.of(
                "tipo", "DNS Configurado",
                "url", HTTP_PREFIX + "fila.experimentaai" + portaFormato,
                "dns", "fila.experimentaai"
            ));
            
            // Canonical hostname (se diferente)
            if (!canonicalHostname.equals(hostname) && 
                !canonicalHostname.equals(hostAddress) && 
                !canonicalHostname.equals(LOCALHOST)) {
                enderecos.add(Map.of(
                    "tipo", "Hostname Canônico",
                    "url", HTTP_PREFIX + canonicalHostname + portaFormato,
                    "dns", canonicalHostname
                ));
            }

            String html = generateHtmlPage(enderecos, hostname, hostAddress, serverPort);
            return ResponseEntity.ok(html);
            
        } catch (UnknownHostException e) {
            String errorHtml = generateErrorHtml(e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorHtml);
        }
    }

    @GetMapping("/api")
    public ResponseEntity<Map<String, Object>> getStatusApi() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "online");
        status.put("timestamp", System.currentTimeMillis());
        
        String portaFormato = (serverPort == 80) ? "" : ":" + serverPort;
        
        try {
            InetAddress localHost = InetAddress.getLocalHost();
            List<Map<String, String>> enderecos = new ArrayList<>();
            
            enderecos.add(Map.of("tipo", "Localhost", "url", HTTP_PREFIX + LOCALHOST + portaFormato, "dns", LOCALHOST));
            enderecos.add(Map.of("tipo", "IP da Máquina", "url", HTTP_PREFIX + localHost.getHostAddress() + portaFormato, "dns", localHost.getHostAddress()));
            enderecos.add(Map.of("tipo", "DNS Configurado", "url", HTTP_PREFIX + "fila.experimentaai" + portaFormato, "dns", "fila.experimentaai"));
            
            status.put("enderecos", enderecos);
            status.put("hostname", localHost.getHostName());
            status.put("hostAddress", localHost.getHostAddress());
            status.put("porta", serverPort);
            
        } catch (UnknownHostException e) {
            status.put("erro", "Não foi possível obter informações de rede: " + e.getMessage());
        }
        
        return ResponseEntity.ok(status);
    }

    private String generateHtmlPage(List<Map<String, String>> enderecos, String hostname, String hostAddress, int porta) {
        StringBuilder enderecosHtml = new StringBuilder();
        for (Map<String, String> endereco : enderecos) {
            enderecosHtml.append(String.format("""
                <div class="endereco-card">
                    <div class="endereco-tipo">%s</div>
                    <div class="endereco-dns">%s</div>
                    <a href="%s" class="endereco-link" target="_blank">%s</a>
                </div>
                """,
                endereco.get("tipo"),
                endereco.get("dns"),
                endereco.get("url"),
                endereco.get("url")
            ));
        }

        return String.format("""
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Status - Lobby Pedidos</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                        padding: 40px;
                        max-width: 800px;
                        width: 100%%;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                    }
                    .status-indicator {
                        display: inline-block;
                        width: 20px;
                        height: 20px;
                        background: #10b981;
                        border-radius: 50%%;
                        animation: pulse 2s infinite;
                        margin-right: 10px;
                        vertical-align: middle;
                    }
                    @keyframes pulse {
                        0%%, 100%% { opacity: 1; }
                        50%% { opacity: 0.5; }
                    }
                    h1 {
                        color: #1f2937;
                        font-size: 2.5em;
                        margin-bottom: 10px;
                        display: inline-block;
                        vertical-align: middle;
                    }
                    .subtitle {
                        color: #6b7280;
                        font-size: 1.1em;
                        margin-top: 10px;
                    }
                    .status-badge {
                        display: inline-block;
                        background: #10b981;
                        color: white;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 0.9em;
                        font-weight: 600;
                        margin-top: 20px;
                    }
                    .enderecos-section {
                        margin-top: 40px;
                    }
                    .section-title {
                        color: #1f2937;
                        font-size: 1.5em;
                        margin-bottom: 20px;
                        border-bottom: 2px solid #e5e7eb;
                        padding-bottom: 10px;
                    }
                    .enderecos-grid {
                        display: grid;
                        gap: 20px;
                    }
                    .endereco-card {
                        background: #f9fafb;
                        border: 2px solid #e5e7eb;
                        border-radius: 12px;
                        padding: 20px;
                        transition: all 0.3s ease;
                    }
                    .endereco-card:hover {
                        border-color: #667eea;
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
                    }
                    .endereco-tipo {
                        color: #6b7280;
                        font-size: 0.9em;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                    }
                    .endereco-dns {
                        color: #1f2937;
                        font-size: 1.2em;
                        font-weight: 600;
                        margin-bottom: 12px;
                        font-family: 'Courier New', monospace;
                    }
                    .endereco-link {
                        display: inline-block;
                        color: #667eea;
                        text-decoration: none;
                        font-weight: 500;
                        transition: color 0.3s ease;
                    }
                    .endereco-link:hover {
                        color: #764ba2;
                        text-decoration: underline;
                    }
                    .info-section {
                        margin-top: 30px;
                        padding-top: 30px;
                        border-top: 2px solid #e5e7eb;
                        color: #6b7280;
                        font-size: 0.9em;
                    }
                    .info-row {
                        margin: 8px 0;
                    }
                    .info-label {
                        font-weight: 600;
                        color: #374151;
                    }
                    @media (max-width: 600px) {
                        .container {
                            padding: 20px;
                        }
                        h1 {
                            font-size: 2em;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>
                            <span class="status-indicator"></span>
                            Sistema Online
                        </h1>
                        <div class="subtitle">Lobby Pedidos - Experimenta aí</div>
                        <div class="status-badge">✓ Status: Operacional</div>
                    </div>
                    
                    <div class="enderecos-section">
                        <h2 class="section-title">Endereços Disponíveis</h2>
                        <div class="enderecos-grid">
                            %s
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">Hostname:</span> %s
                        </div>
                        <div class="info-row">
                            <span class="info-label">IP:</span> %s
                        </div>
                        <div class="info-row">
                            <span class="info-label">Porta:</span> %d
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, enderecosHtml.toString(), hostname, hostAddress, porta);
    }

    private String generateErrorHtml(String error) {
        return String.format("""
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Erro - Lobby Pedidos</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .container {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        max-width: 600px;
                        text-align: center;
                    }
                    h1 { color: #ef4444; margin-bottom: 20px; }
                    p { color: #6b7280; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>Erro ao obter informações</h1>
                    <p>%s</p>
                </div>
            </body>
            </html>
            """, error);
    }
}

