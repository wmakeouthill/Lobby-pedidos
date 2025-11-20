package com.experimentaai.lobby;

import com.experimentaai.lobby.util.WindowsIconUtil;

import java.awt.GraphicsEnvironment;
import java.io.PrintWriter;
import java.io.StringWriter;

public class Launcher {

    private static final String APP_NAME = "Lobby Pedidos - Experimenta Aí";

    public static void main(String[] args) {
        // Garantir que não está em modo headless ANTES de qualquer operação GUI
        System.setProperty("java.awt.headless", "false");
        System.setProperty("java.awt.application.name", APP_NAME);
        
        // Definir nome da aplicação para o Windows (usado no gerenciador de tarefas e barra de tarefas)
        // No Windows, o nome do processo é definido pelo executável, mas podemos tentar definir via JNA se disponível
        // Por enquanto, o nome será definido pelo executável quando compilado
        
        // Verificar se GUI está disponível
        if (GraphicsEnvironment.isHeadless()) {
            System.err.println("ERRO: Ambiente headless detectado!");
            System.err.println("A aplicação requer interface gráfica.");
            System.exit(1);
        }

        // Carregar e aplicar ícone da aplicação antes de iniciar
        // Isso garante que o ícone apareça corretamente na barra de tarefas do Windows
        try {
            java.awt.image.BufferedImage iconImage = WindowsIconUtil.loadApplicationIcon();
            if (iconImage != null) {
                System.out.println("Ícone da aplicação carregado com sucesso (" + iconImage.getWidth() + "x" + iconImage.getHeight() + ")");

                // Tentar definir ícone do processo via Taskbar API
                if (java.awt.Taskbar.isTaskbarSupported()) {
                    java.awt.Taskbar taskbar = java.awt.Taskbar.getTaskbar();
                    if (taskbar.isSupported(java.awt.Taskbar.Feature.ICON_IMAGE)) {
                        taskbar.setIconImage(iconImage);
                        System.out.println("Ícone definido na barra de tarefas via Taskbar API");
                    }
                }

                // Definir propriedade do sistema para ícone
                java.net.URL iconUrl = Launcher.class.getResource("/icon.ico");
                if (iconUrl != null) {
                    System.setProperty("java.awt.application.icon", iconUrl.toString());
                    System.out.println("Propriedade java.awt.application.icon definida: " + iconUrl);
                }

            } else {
                System.err.println("Aviso: Não foi possível carregar ícone da aplicação");
            }
        } catch (Exception e) {
            System.err.println("Aviso: Não foi possível carregar ícone da aplicação: " + e.getMessage());
            // Continuar mesmo se o ícone não puder ser carregado
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
