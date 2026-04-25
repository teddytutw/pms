package com.pms.repository;

import com.pms.entity.ActivityTeamMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

public interface ActivityTeamMemberRepository extends JpaRepository<ActivityTeamMember, Long> {
    List<ActivityTeamMember> findByTargetTypeAndTargetId(String targetType, String targetId);
    boolean existsByTargetTypeAndTargetIdAndUserId(String targetType, String targetId, Long userId);

    @Transactional
    void deleteByTargetTypeAndTargetId(String targetType, String targetId);

    List<ActivityTeamMember> findByTargetTypeAndUserIdAndResponsibility(String targetType, Long userId, String responsibility);
    List<ActivityTeamMember> findByTargetTypeAndUserId(String targetType, Long userId);
}
