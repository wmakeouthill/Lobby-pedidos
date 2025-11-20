package com.experimentaai.lobby;

import java.awt.GraphicsEnvironment;
import java.io.PrintWriter;
import java.io.StringWriter;

public class Launcher {

    private static final String APP_NAME = "lobby";

    public static void main(String[] args) {
        // Garantir que não está em modo headless ANTES de qualquer operação GUI
        System.setProperty("java.awt.headless", "false");
        System.setProperty("java.awt.application.name", APP_NAME);
        
        // Verificar se GUI está disponível
        if (GraphicsEnvironment.isHeadless()) {
            System.err.println("ERRO: Ambiente headless detectado!");
            System.err.println("A aplicação requer interface gráfica.");
            System.exit(1);
        }

        try {
            // Log de inicialização para debug
            System.out.println("========================================");
            System.out.println("Iniciando " + APP_NAME + "...");
            System.out.println("Modo headless: " + GraphicsEnvironment.isHeadless());
            System.out.println("Java version: " + System.getProperty("java.version"));
            System.out.println("Java home: " + System.getProperty("java.home"));
            System.out.println("========================================");
            
            // Garantir que a thread principal não termine antes da GUI
            // Isso é importante para aplicações Swing
            System.setProperty("java.awt.headless", "false");
            
            // Iniciar aplicação Spring Boot
            System.out.println("Iniciando Spring Boot...");
            LobbyPedidosApplication.main(args);
            
            System.out.println("Spring Boot iniciado. Aguardando janela de status...");
            
        } catch (Exception e) {
            System.err.println("ERRO FATAL ao iniciar aplicação:");
            System.err.println("========================================");
            e.printStackTrace();
            System.err.println("========================================");
            
            // Tentar salvar log em arquivo
            try {
                java.io.File logDir = new java.io.File("logs");
                if (!logDir.exists()) {
                    logDir.mkdirs();
                }
                java.io.File logFile = new java.io.File(logDir, "error-" + 
                    java.time.LocalDateTime.now().toString().replace(":", "-") + ".log");
                try (java.io.PrintWriter pw = new java.io.PrintWriter(
                        new java.io.FileWriter(logFile, true))) {
                    pw.println("ERRO FATAL ao iniciar aplicação:");
                    pw.println("Data/Hora: " + java.time.LocalDateTime.now());
                    pw.println("========================================");
                    e.printStackTrace(pw);
                    pw.println("========================================");
                    System.err.println("Log de erro salvo em: " + logFile.getAbsolutePath());
                }
            } catch (Exception logEx) {
                System.err.println("Não foi possível salvar log de erro: " + logEx.getMessage());
            }
            
            // Tentar mostrar diálogo de erro se GUI estiver disponível
            if (!GraphicsEnvironment.isHeadless()) {
                try {
                    javax.swing.SwingUtilities.invokeLater(() -> {
                        StringWriter sw = new StringWriter();
                        PrintWriter pw = new PrintWriter(sw);
                        e.printStackTrace(pw);
                        String errorMsg = "Erro ao iniciar aplicação:\n\n" + 
                                        e.getMessage() + "\n\n" + 
                                        "Detalhes completos foram salvos em:\n" +
                                        "logs/error-*.log\n\n" +
                                        "Primeiras linhas do erro:\n" + 
                                        sw.toString().substring(0, Math.min(500, sw.toString().length()));
                        
                        javax.swing.JOptionPane.showMessageDialog(
                            null,
                            errorMsg,
                            "Erro - " + APP_NAME,
                            javax.swing.JOptionPane.ERROR_MESSAGE
                        );
                    });
                    // Aguardar um pouco para o diálogo aparecer
                    Thread.sleep(5000);
                } catch (Exception ex) {
                    // Se falhar ao mostrar diálogo, apenas logar
                    System.err.println("Não foi possível exibir diálogo de erro.");
                }
            }
            
            // Aguardar antes de sair para que o usuário possa ver o erro
            System.err.println("\nPressione Enter para sair...");
            try {
                System.in.read();
            } catch (java.io.IOException ioEx) {
                // Ignorar
            }
            
            System.exit(1);
        }
    }
}
