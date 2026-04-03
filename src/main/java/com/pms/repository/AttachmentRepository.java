package com.pms.repository;

import com.pms.entity.Attachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AttachmentRepository extends JpaRepository<Attachment, Long> {
    List<Attachment> findByTargetTypeAndTargetIdOrderByUploadedAtDesc(String targetType, String targetId);
}
