package com.experimentaai.lobby.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Servir arquivos estáticos do frontend
        // As rotas /api/** são tratadas pelo @RestController e têm prioridade automática
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String resourcePath, Resource location) throws IOException {
                        // Ignorar rotas de API e status
                        if (resourcePath.startsWith("api/") || resourcePath.startsWith("status")) {
                            return null;
                        }
                        
                        Resource requestedResource = location.createRelative(resourcePath);
                        // Se o recurso não existir, retornar index.html (para suportar React Router)
                        return requestedResource.exists() && requestedResource.isReadable() 
                            ? requestedResource 
                            : new ClassPathResource("/static/index.html");
                    }
                });
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        // A rota raiz aponta para o frontend React
        // A interface gráfica Java (StatusWindow) mostra o status quando o servidor inicia
        registry.addViewController("/").setViewName("forward:/index.html");
    }
}

